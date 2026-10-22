import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { AguardandoCliente } from "@/components/projetos/AguardandoCliente";
import { CancelarProjetoPainel } from "@/components/projetos/CancelarProjetoPainel";
import { EditarProjetoPainel } from "@/components/projetos/EditarProjetoPainel";
import { SaudeEntrega } from "@/components/projetos/SaudeEntrega";
import { useSession } from "@/hooks/useSession";
import { LancarHorasPainel } from "@/components/projetos/LancarHorasPainel";
import { NovaPendenciaPainel } from "@/components/projetos/NovaPendenciaPainel";
import { NovaTarefaPainel } from "@/components/projetos/NovaTarefaPainel";
import { PedirAprovacaoPainel } from "@/components/projetos/PedirAprovacaoPainel";
import { ProjetoCabecalho } from "@/components/projetos/ProjetoCabecalho";
import { ProjetoEncerramento } from "@/components/projetos/ProjetoEncerramento";
import { ProjetoFases } from "@/components/projetos/ProjetoFases";
import { ProjetoModulos } from "@/components/projetos/ProjetoModulos";
import {
  ModuloPainel,
  type EnvioModulo,
  type ModoModulo,
} from "@/components/projetos/ModuloPainel";
import type { AcaoModulo } from "@/components/projetos/ModuloLinha";
import { usePainelNaUrl } from "@/hooks/usePainelNaUrl";
import type { Modulo } from "@/lib/projetos";
import { ProjetoHoras } from "@/components/projetos/ProjetoHoras";
import { ProjetoLinhaDoTempo } from "@/components/projetos/ProjetoLinhaDoTempo";
import { ProjetoNumeros } from "@/components/projetos/ProjetoNumeros";
import { ProjetoPedidos } from "@/components/projetos/ProjetoPedidos";
import { QuadroCiclo } from "@/components/projetos/QuadroCiclo";
import { useMutacoesProjeto } from "@/components/projetos/useMutacoesProjeto";
import { TarefaPainel } from "@/components/tarefas/TarefaPainel";
import { naoRemovida } from "@/components/tarefas/useMutacoesTarefa";
import { chavesProjetos, detalheProjeto, faseAtual } from "@/lib/projetos";
import { daTarefaDoProjeto } from "@/lib/tarefas";
import { diaMes } from "@/lib/formatar";
import { cn } from "@/lib/utils";

const abas = ["andamento", "pedidos", "horas", "encerramento", "linha"] as const;
type Aba = (typeof abas)[number];
const busca = z.object({
  aba: z.enum(abas).optional().catch(undefined),
  /** Tarefa aberta no painel (vinda da Central: abre o ciclo certo). */
  tarefa: z.string().uuid().optional().catch(undefined),
});

export const Route = createFileRoute("/app/projetos/$id")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Projeto · Hub Fora do Papel" }] }),
  component: Projeto,
});

function Projeto() {
  const { id } = Route.useParams();
  const { aba = "andamento", tarefa: tarefaAberta } = Route.useSearch();
  const navigate = Route.useNavigate();
  const q = useQuery({ queryKey: chavesProjetos.detalhe(id), queryFn: () => detalheProjeto(id) });
  const m = useMutacoesProjeto(id);
  const [painel, setPainel] = useState<null | "aprovacao" | "pendencia" | "tarefa" | "horas">(null);
  const [painelModulo, setPainelModulo] = useState<{ modo: ModoModulo; m: Modulo | null } | null>(
    null,
  );
  const [faseDoPedido, setFaseDoPedido] = useState<string | null>(null);
  const [tituloDoPedido, setTituloDoPedido] = useState<string | null>(null);
  const [editar, setEditar] = useState(false);
  const [cancelar, setCancelar] = useState(false);
  const { session } = useSession();
  const remetente =
    ((session?.user.user_metadata?.["full_name"] as string | undefined) ?? "").split(" ")[0] ?? "";
  const [ciclo, setCiclo] = useState<number | null>(null);
  // Abrir a tarefa cria entrada no histórico; fechar pela tela não (RD-9)
  const painelTarefa = usePainelNaUrl(
    (tid, o) => void navigate({ search: (s) => ({ ...s, tarefa: tid }), ...o }),
  );

  if (q.isError) {
    const sumiu = /projeto_inexistente/.test(String((q.error as { message?: string })?.message));
    return sumiu ? (
      <div className="flex flex-col items-start gap-3">
        <h1 className="font-titulo text-2xl font-bold">Projeto não encontrado</h1>
        <Link
          to="/app/projetos"
          className="inline-flex min-h-11 items-center font-medium text-[#1E3FA8] underline"
        >
          Voltar para Projetos
        </Link>
      </div>
    ) : (
      <EstadoErro
        titulo="Não foi possível abrir o projeto"
        aoTentarDeNovo={() => void q.refetch()}
      />
    );
  }
  if (!q.data) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <div className="h-20 w-96 max-w-full animate-pulse rounded-xl bg-white" />
        <div className="h-40 animate-pulse rounded-2xl bg-white" />
        <div className="h-64 animate-pulse rounded-2xl bg-white" />
      </div>
    );
  }

  const d = q.data;
  const tarefas = d.tarefas.filter(naoRemovida);
  const aberta = tarefaAberta ? tarefas.find((t) => t.id === tarefaAberta) : undefined;
  const cicloAtual = ciclo ?? aberta?.cycle ?? Math.max(1, ...tarefas.map((t) => t.cycle));
  const atual = faseAtual(d.fases);
  const aguardando =
    d.aprovacoes.filter((a) => a.status === "aguardando").length +
    d.pendencias.filter((p) => p.status === "aberta").length +
    d.pedidos.filter((p) => p.status === "aguardando_cliente").length;
  const rotulos: Record<Aba, { rotulo: string; contagem?: number }> = {
    andamento: { rotulo: "Andamento", contagem: aguardando },
    pedidos: { rotulo: "Pedidos do projeto", contagem: d.pedidos.length },
    horas: { rotulo: "Horas" },
    encerramento: {
      rotulo: "Encerramento",
      contagem: d.checklist.filter((i) => !i.done).length,
    },
    linha: { rotulo: "Linha do tempo" },
  };

  return (
    <div className="flex flex-col gap-5">
      <ProjetoCabecalho
        d={d}
        aoEditar={() => setEditar(true)}
        aoCancelar={() => setCancelar(true)}
      />
      <ProjetoNumeros d={d} />
      <SaudeEntrega saude={d.saude} />
      {d.projeto.kind === "sob_medida" ? (
        <ProjetoModulos
          d={d}
          ocupado={m.moverMod.isPending || m.publicarMod.isPending || m.aprovacaoMod.isPending}
          aoNovo={() => setPainelModulo({ modo: "novo", m: null })}
          aoVoltarParaFases={() => m.tipo.mutate("padrao")}
          aoAgir={(mod: Modulo, acao: AcaoModulo) => {
            if (acao.tipo === "mover") m.moverMod.mutate({ id: mod.id, situacao: acao.situacao });
            else if (acao.tipo === "cancelar_aprovacao") m.cancelar.mutate(acao.aprovacaoId);
            else setPainelModulo({ modo: acao.modo, m: mod });
          }}
        />
      ) : (
        <ProjetoFases
          d={d}
          aoMudarParaModulos={() => m.tipo.mutate("sob_medida")}
          aoConcluir={() => {
            setFaseDoPedido(atual?.fase.id ?? null);
            setTituloDoPedido(null);
            setPainel("aprovacao");
          }}
        />
      )}

      <div
        role="tablist"
        aria-label="Seções do projeto"
        className="-mx-4 flex gap-1 overflow-x-auto border-b border-hub-borda px-4 sm:mx-0 sm:px-0"
      >
        {abas.map((a) => (
          <button
            key={a}
            role="tab"
            type="button"
            aria-selected={aba === a}
            onClick={() =>
              void navigate({
                search: (s) => ({ ...s, aba: a === "andamento" ? undefined : a }),
                replace: true,
              })
            }
            className={cn(
              "-mb-px flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-[15px]",
              aba === a
                ? "border-hub-tinta font-semibold"
                : "border-transparent text-hub-suave hover:text-hub-tinta",
            )}
          >
            {rotulos[a].rotulo}
            {rotulos[a].contagem ? (
              <span className="rounded-md bg-sit-neutro px-1.5 text-[12.5px] tabular-nums">
                {rotulos[a].contagem}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {aba === "andamento" && (
        <div className="flex flex-col gap-6">
          <AguardandoCliente
            d={d}
            aoPedirAprovacao={() => {
              setFaseDoPedido(null);
              setTituloDoPedido(null);
              setPainel("aprovacao");
            }}
            aoNovaPendencia={() => setPainel("pendencia")}
            aoMarcarPendencia={(pid, feita) => m.marcar.mutate({ id: pid, feita })}
            aoRemoverPendencia={(pid) => m.removerPend.mutate(pid)}
            aoCancelarAprovacao={(aid) => m.cancelar.mutate(aid)}
            remetente={remetente}
            aoReenviar={(titulo, faseId) => {
              setFaseDoPedido(faseId);
              setTituloDoPedido(titulo);
              setPainel("aprovacao");
            }}
          />
          <QuadroCiclo
            projetoId={id}
            tarefas={tarefas}
            hoje={d.hoje}
            codigoPedido={(t) =>
              t.request_id ? (d.pedidos.find((p) => p.id === t.request_id)?.code ?? null) : null
            }
            ciclo={cicloAtual}
            aoTrocarCiclo={setCiclo}
            aoNovaTarefa={() => setPainel("tarefa")}
            aoAbrir={(t) => painelTarefa.abrir(t.id)}
            aoMover={(t, s) => m.mover.mutate({ id: t.id, situacao: s })}
            aoRemover={(t) => m.removerTar(t)}
          />
        </div>
      )}
      {aba === "pedidos" && <ProjetoPedidos pedidos={d.pedidos} />}
      {aba === "horas" && (
        <ProjetoHoras
          d={d}
          aoLancar={() => setPainel("horas")}
          aoRemover={(hid, minutos) => m.removerH.mutate({ id: hid, minutos })}
        />
      )}
      {aba === "encerramento" && (
        <ProjetoEncerramento
          d={d}
          aoMarcar={(iid, feito) => m.encerramento.mutate({ id: iid, feito })}
          aoIncluir={(titulo) => m.itemEncerramento.mutate(titulo)}
          aoLancar={() => m.lancar.mutate(undefined)}
          aoMudarData={(data) => m.atualizar.mutate({ lancamento: data ?? "" })}
        />
      )}
      {aba === "encerramento" && d.projeto.canceled_at && (
        <p className="rounded-2xl bg-sit-risco p-4 text-[14.5px] text-sit-risco-t">
          Cancelado em {diaMes(d.projeto.canceled_at)}. Motivo: {d.projeto.cancel_reason}
        </p>
      )}
      {aba === "encerramento" && !d.projeto.canceled_at && d.projeto.status !== "concluido" && (
        <div className="flex flex-col gap-1 rounded-2xl border border-dashed border-[#E3B4AE] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[14px] text-hub-suave">
            O cliente desistiu ou o projeto foi criado por engano?
          </p>
          <button
            type="button"
            className="inline-flex min-h-11 items-center self-start px-2 text-[14.5px] font-medium text-sit-risco-t"
            onClick={() => setCancelar(true)}
          >
            Cancelar projeto
          </button>
        </div>
      )}
      {aba === "linha" && <ProjetoLinhaDoTempo itens={d.linha} />}

      <PedirAprovacaoPainel
        aberto={painel === "aprovacao"}
        aoMudar={(v) => !v && setPainel(null)}
        fases={d.fases}
        faseInicial={faseDoPedido}
        tituloInicial={tituloDoPedido}
        aoEnviar={(v) => m.aprovacao.mutate({ projetoId: id, ...v })}
        aoConcluirSemAprovacao={(fid) => m.fase.mutate(fid)}
      />
      <NovaPendenciaPainel
        aberto={painel === "pendencia"}
        aoMudar={(v) => !v && setPainel(null)}
        aoCriar={(v) => m.pendencia.mutate({ projetoId: id, ...v })}
      />
      <NovaTarefaPainel
        aberto={painel === "tarefa"}
        aoMudar={(v) => !v && setPainel(null)}
        ciclo={cicloAtual}
        aoCriar={(v) => m.tarefa.mutate({ projetoId: id, ciclo: cicloAtual, ...v })}
      />
      <EditarProjetoPainel
        d={d}
        aberto={editar}
        aoMudar={setEditar}
        aoSalvar={(v) =>
          m.atualizar.mutate({
            nome: v.nome,
            horas_estimadas: v.horas_estimadas,
            lancamento: v.lancamento,
          })
        }
      />
      <ModuloPainel
        modo={painelModulo?.modo ?? null}
        modulo={painelModulo?.m ?? null}
        aoFechar={() => setPainelModulo(null)}
        aoEnviar={(v: EnvioModulo) => {
          if (v.modo === "novo")
            m.novoModulo.mutate({ projetoId: id, nome: v.nome, caminho: v.caminho });
          else if (v.modo === "editar")
            m.editarMod.mutate({ id: v.id, nome: v.nome, caminho: v.caminho });
          else if (v.modo === "testes")
            m.moverMod.mutate({ id: v.id, situacao: "testes", linkTestes: v.linkTestes });
          else if (v.modo === "aprovacao")
            m.aprovacaoMod.mutate({
              id: v.id,
              descricao: v.descricao,
              itens: [],
              previa: v.previa,
            });
          else m.publicarMod.mutate({ id: v.id, notas: v.notas, link: v.link });
        }}
      />
      <CancelarProjetoPainel projetoId={id} aberto={cancelar} aoMudar={setCancelar} />
      <TarefaPainel
        tarefa={aberta ? daTarefaDoProjeto(aberta, d) : null}
        hoje={d.hoje}
        noProjeto
        aoFechar={painelTarefa.fechar}
      />
      <LancarHorasPainel
        aberto={painel === "horas"}
        aoMudar={(v) => !v && setPainel(null)}
        projetoFixo={{ id, rotulo: `${d.cliente.empresa} · ${d.projeto.name}` }}
        aoLancar={(v) => m.horas.mutate(v)}
      />
    </div>
  );
}
