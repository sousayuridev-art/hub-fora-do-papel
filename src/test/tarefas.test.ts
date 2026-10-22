import { describe, expect, it } from "vitest";

import type { Tarefa } from "@/lib/projetos";
import {
  agruparPorPrazo,
  ajustarTarefa,
  avisoDoPrazo,
  buscaTarefas,
  combinaComFiltros,
  diasEntre,
  estaAtrasada,
  filtrosAtivos,
  filtrosDaBusca,
  filtrosDoResumo,
  grupoDoPrazo,
  linhasDaLista,
  moverLocal,
  opcoesDosFiltros,
  origemDaTarefa,
  somarDias,
  tarefaProvisoria,
  textoPrazo,
  type TarefaVista,
} from "@/lib/tarefas";

const HOJE = "2026-10-22"; // quinta-feira
const UUID = "50000000-0000-0000-0000-000000000001";
const CLI = "20000000-0000-0000-0000-000000000001";

function tarefa(p: Partial<TarefaVista> = {}): TarefaVista {
  return {
    id: p.id ?? "t1",
    project_id: UUID,
    request_id: null,
    cycle: 1,
    area: null,
    title: "Revisar textos",
    description: null,
    status: "a_fazer",
    position: 1,
    kind: "cliente",
    priority: "normal",
    due_date: null,
    assignee_id: null,
    done_at: null,
    card_ref: null,
    created_at: "2026-10-15T10:00:00Z",
    updated_at: "2026-10-15T10:00:00Z",
    atrasada: false,
    projeto: { id: UUID, nome: "Sistema", situacao: "andamento" },
    cliente: { id: CLI, empresa: "Rede Patas" },
    pedido: null,
    ...p,
  };
}

describe("datas", () => {
  it("soma dias atravessando o mês", () => {
    expect(somarDias(HOJE, 6)).toBe("2026-10-28");
    expect(somarDias("2026-10-30", 3)).toBe("2026-11-02");
  });
  it("conta dias entre datas", () => {
    expect(diasEntre(HOJE, "2026-10-20")).toBe(-2);
    expect(diasEntre(HOJE, HOJE)).toBe(0);
  });
  it("atrasada só quando o prazo passou e não está pronta", () => {
    expect(estaAtrasada({ due_date: "2026-10-21", status: "fazendo" }, HOJE)).toBe(true);
    expect(estaAtrasada({ due_date: "2026-10-21", status: "pronto" }, HOJE)).toBe(false);
    expect(estaAtrasada({ due_date: HOJE, status: "a_fazer" }, HOJE)).toBe(false);
    expect(estaAtrasada({ due_date: null, status: "a_fazer" }, HOJE)).toBe(false);
  });
});

describe("texto do prazo", () => {
  it("venceu, hoje, amanhã, dia da semana e data", () => {
    const t = (due_date: string | null) =>
      textoPrazo({ due_date, status: "a_fazer", done_at: null }, HOJE);
    expect(t("2026-10-20")).toEqual({ texto: "venceu 20/10", tom: "risco" });
    expect(t(HOJE)).toEqual({ texto: "hoje", tom: "atencao" });
    expect(t("2026-10-23").texto).toBe("amanhã");
    expect(t("2026-10-24").texto).toBe("sáb 24/10");
    expect(t("2026-11-15").texto).toBe("15/11");
    expect(t(null)).toEqual({ texto: "sem prazo", tom: "vazio" });
  });
  it("pronta mostra quando foi feita", () => {
    expect(
      textoPrazo(
        { due_date: "2026-10-01", status: "pronto", done_at: "2026-10-21T15:00:00" },
        HOJE,
      ),
    ).toEqual({ texto: "feito 21/10", tom: "ok" });
  });
  it("aviso do painel", () => {
    expect(avisoDoPrazo({ due_date: "2026-10-20", status: "fazendo" }, HOJE)).toBe(
      "Atrasada há 2 dias",
    );
    expect(avisoDoPrazo({ due_date: "2026-10-21", status: "fazendo" }, HOJE)).toBe(
      "Atrasada há 1 dia",
    );
    expect(avisoDoPrazo({ due_date: HOJE, status: "fazendo" }, HOJE)).toBe("Vence hoje");
    expect(avisoDoPrazo({ due_date: "2026-10-20", status: "pronto" }, HOJE)).toBeNull();
  });
});

describe("agrupamento por prazo", () => {
  it("põe cada tarefa no grupo certo", () => {
    expect(grupoDoPrazo({ due_date: "2026-10-21", status: "a_fazer" }, HOJE)).toBe("atrasadas");
    expect(grupoDoPrazo({ due_date: HOJE, status: "a_fazer" }, HOJE)).toBe("hoje");
    expect(grupoDoPrazo({ due_date: "2026-10-28", status: "a_fazer" }, HOJE)).toBe("semana");
    expect(grupoDoPrazo({ due_date: "2026-10-29", status: "a_fazer" }, HOJE)).toBe("depois");
    expect(grupoDoPrazo({ due_date: null, status: "fazendo" }, HOJE)).toBe("sem_prazo");
    expect(grupoDoPrazo({ due_date: "2026-10-01", status: "pronto" }, HOJE)).toBe("concluidas");
  });
  it("respeita a marca 'atrasada' que veio do banco", () => {
    expect(grupoDoPrazo({ due_date: HOJE, status: "a_fazer", atrasada: true }, HOJE)).toBe(
      "atrasadas",
    );
  });
  it("ordena os grupos e tira os vazios, mantendo a ordem do banco dentro do grupo", () => {
    const itens = [
      tarefa({ id: "a", due_date: null }),
      tarefa({ id: "b", due_date: "2026-10-20", atrasada: true }),
      tarefa({ id: "c", due_date: HOJE }),
      tarefa({ id: "d", due_date: "2026-10-19", atrasada: true }),
      tarefa({ id: "e", status: "pronto", done_at: "2026-10-21T10:00:00Z" }),
    ];
    const g = agruparPorPrazo(itens, HOJE);
    expect(g.map((x) => x.id)).toEqual(["atrasadas", "hoje", "sem_prazo", "concluidas"]);
    expect(g[0]?.itens.map((t) => t.id)).toEqual(["b", "d"]);
    expect(g[0]?.rotulo).toBe("Atrasadas");
  });
  it("concluídas ficam recolhidas nas linhas da lista", () => {
    const g = agruparPorPrazo(
      [tarefa({ id: "a", due_date: HOJE }), tarefa({ id: "z", status: "pronto" })],
      HOJE,
    );
    const fechada = linhasDaLista(g, false);
    expect(fechada.map((l) => l.tipo)).toEqual(["grupo", "tarefa", "concluidas"]);
    const aberta = linhasDaLista(g, true);
    expect(aberta.map((l) => l.tipo)).toEqual(["grupo", "tarefa", "concluidas", "tarefa"]);
    expect(aberta[2]).toEqual({ tipo: "concluidas", total: 1, aberto: true });
  });
});

describe("filtros no endereço", () => {
  it("lê valores válidos e descarta os inválidos sem quebrar a página", () => {
    const b = buscaTarefas.parse({
      vista: "kanban",
      tipo: "hub",
      prazo: "ontem",
      projeto: "nao-e-uuid",
      cliente: CLI,
      prioridade: "alta",
      situacao: "fazendo",
    });
    expect(b).toEqual({
      vista: "kanban",
      tipo: "hub",
      prazo: undefined,
      projeto: undefined,
      cliente: CLI,
      prioridade: "alta",
      situacao: "fazendo",
      tarefa: undefined,
    });
  });
  it("monta os filtros do banco só com as chaves presentes (chave de cache estável)", () => {
    const b = buscaTarefas.parse({ vista: "kanban", prazo: "atrasadas", tarefa: UUID });
    expect(filtrosDaBusca(b)).toEqual({ prazo: "atrasadas" });
    expect(filtrosDaBusca(buscaTarefas.parse({}))).toEqual({});
  });
  it("contagens: sem prazo e situação; abas sem o tipo", () => {
    const b = buscaTarefas.parse({
      tipo: "cliente",
      prazo: "hoje",
      situacao: "fazendo",
      projeto: UUID,
    });
    expect(filtrosDoResumo(b, true)).toEqual({ tipo: "cliente", projeto: UUID });
    expect(filtrosDoResumo(b, false)).toEqual({ projeto: UUID });
    expect(filtrosAtivos(b)).toBe(2);
  });
});

describe("atualização local", () => {
  it("editar o prazo recalcula 'atrasada' com o hoje do banco", () => {
    const t = tarefa({ due_date: null });
    const n = ajustarTarefa(t, { prazo: "2026-10-20", prioridade: "alta" }, HOJE);
    expect(n.due_date).toBe("2026-10-20");
    expect(n.priority).toBe("alta");
    expect(n.atrasada).toBe(true);
    expect(ajustarTarefa(n, { prazo: null }, HOJE).atrasada).toBe(false);
  });
  it("na tarefa do projeto (sem 'atrasada'), só muda os campos", () => {
    const { atrasada: _a, projeto: _p, cliente: _c, pedido: _d, ...base } = tarefa();
    const t: Tarefa = base;
    const n = ajustarTarefa(t, { titulo: "Novo título" }, null);
    expect(n.title).toBe("Novo título");
    expect("atrasada" in n).toBe(false);
  });
  it("Pronto grava a conclusão e sair de Pronto apaga", () => {
    const t = tarefa({ due_date: "2026-10-20", atrasada: true });
    const pronta = moverLocal(t, "pronto", HOJE);
    expect(pronta.done_at).not.toBeNull();
    expect(pronta.atrasada).toBe(false);
    const volta = moverLocal(pronta, "a_fazer", HOJE);
    expect(volta.done_at).toBeNull();
    expect(volta.atrasada).toBe(true);
  });
  it("tarefa nova só entra nas listas cujos filtros ela atende", () => {
    const t = tarefa({ due_date: HOJE });
    expect(combinaComFiltros(t, {}, HOJE)).toBe(true);
    expect(combinaComFiltros(t, { prazo: "hoje" }, HOJE)).toBe(true);
    expect(combinaComFiltros(t, { prazo: "semana" }, HOJE)).toBe(true);
    expect(combinaComFiltros(t, { prazo: "atrasadas" }, HOJE)).toBe(false);
    expect(combinaComFiltros(t, { tipo: "interna" }, HOJE)).toBe(false);
    expect(combinaComFiltros(t, { cliente: CLI, projeto: UUID }, HOJE)).toBe(true);
  });
  it("sem projeto, a tarefa provisória é interna (ou Hub)", () => {
    const interna = tarefaProvisoria({ titulo: "Emitir nota" }, null, HOJE);
    expect(interna.kind).toBe("interna");
    expect(interna.project_id).toBeNull();
    expect(tarefaProvisoria({ titulo: "Visual", tipo: "hub" }, null, HOJE).kind).toBe("hub");
    const cli = tarefaProvisoria(
      { titulo: "Textos", prazo: "2026-10-01" },
      { id: UUID, nome: "Sistema", clienteId: CLI, empresa: "Rede Patas" },
      HOJE,
    );
    expect(cli.kind).toBe("cliente");
    expect(cli.atrasada).toBe(true);
  });
});

describe("textos e opções", () => {
  it("origem da tarefa", () => {
    expect(origemDaTarefa(tarefa())).toBe("Rede Patas › Sistema");
    const semProjeto = { project_id: null, projeto: null, cliente: null };
    expect(origemDaTarefa(tarefa({ ...semProjeto, kind: "interna", area: "Financeiro" }))).toBe(
      "Interna · Financeiro",
    );
    expect(origemDaTarefa(tarefa({ ...semProjeto, kind: "hub", card_ref: "TA-0" }))).toBe(
      "Hub · card TA-0",
    );
  });
  it("opções de cliente e projeto: ativos + os da lista; projeto segue o cliente", () => {
    const projetos = [
      { id: "p1", nome: "Loja", clienteId: "c1", empresa: "Casa Aurora" },
      { id: "p2", nome: "Site", clienteId: "c2", empresa: "Ótica Nova" },
    ];
    const o = opcoesDosFiltros(projetos, [tarefa()], {});
    expect(o.clientes.map((c) => c.rotulo)).toEqual(["Casa Aurora", "Ótica Nova", "Rede Patas"]);
    expect(o.projetos.map((p) => p.rotulo)).toContain("Rede Patas › Sistema");
    const so = opcoesDosFiltros(projetos, [], { cliente: "c1", projeto: "sumiu" });
    expect(so.projetos).toEqual([
      { id: "p1", rotulo: "Loja" },
      { id: "sumiu", rotulo: "Projeto escolhido" },
    ]);
  });
});
