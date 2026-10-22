import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BellRing, Plus, Search } from "lucide-react";
import { z } from "zod";

import { Abas } from "@/components/hub/Abas";
import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { CobrancaPainel } from "@/components/financeiro/CobrancaPainel";
import { CobrancasLista, type GrupoLista } from "@/components/financeiro/CobrancasLista";
import { DespesaPainel } from "@/components/financeiro/DespesaPainel";
import { DespesasLista } from "@/components/financeiro/DespesasLista";
import { FinanceiroNumeros } from "@/components/financeiro/FinanceiroNumeros";
import { FluxoCaixa } from "@/components/financeiro/FluxoCaixa";
import { GraficoEntradasSaidas } from "@/components/financeiro/GraficoEntradasSaidas";
import { GraficoMensalidades } from "@/components/financeiro/GraficoMensalidades";
import { MensalidadesLista } from "@/components/financeiro/MensalidadesLista";
import { NovaCobrancaPainel } from "@/components/financeiro/NovaCobrancaPainel";
import { NovaMensalidadePainel } from "@/components/financeiro/NovaMensalidadePainel";
import { useMutacoesFinanceiro } from "@/components/financeiro/useMutacoesFinanceiro";
import { useSession } from "@/hooks/useSession";
import { usePainelNaUrl } from "@/hooks/usePainelNaUrl";
import { classeAcaoPrincipal, classeBotaoSecundario } from "@/lib/estilos";
import { moeda } from "@/lib/formatar";
import {
  chavesFinanceiro,
  graficosFinanceiro,
  grupoDaCobranca,
  painelFinanceiro,
  type CobrancaLinha,
  type Despesa,
  type GrupoCobranca,
} from "@/lib/financeiro";

const abas = ["cobrancas", "mensalidades", "despesas", "fluxo"] as const;
type Aba = (typeof abas)[number];
// "abertas" (padrão) mostra todos os grupos; "recebidas" fica por compatibilidade com links antigos
const filtros = ["abertas", "atrasadas", "sem_data", "recebidas"] as const;

const busca = z.object({
  aba: z.enum(abas).optional().catch(undefined),
  filtro: z.enum(filtros).optional().catch(undefined),
  recebidas: z.boolean().optional().catch(undefined),
  cobranca: z.string().uuid().optional().catch(undefined),
  cliente: z.string().uuid().optional().catch(undefined),
});

export const Route = createFileRoute("/app/financeiro")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Financeiro · Hub Fora do Papel" }] }),
  component: Financeiro,
});

const gruposAbertos: { id: GrupoCobranca; titulo: string; tom: GrupoLista["tom"] }[] = [
  { id: "atrasadas", titulo: "Atrasadas", tom: "risco" },
  { id: "semana", titulo: "Esta semana", tom: "atencao" },
  { id: "trinta", titulo: "Próximos 30 dias", tom: "neutro" },
  { id: "depois", titulo: "Mais adiante", tom: "neutro" },
  { id: "sem_data", titulo: "Sem data", tom: "neutro" },
];

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Financeiro() {
  const {
    aba = "cobrancas",
    filtro = "abertas",
    recebidas: mostrarRecebidas,
    cobranca,
    cliente,
  } = Route.useSearch();
  const navigate = Route.useNavigate();
  const q = useQuery({ queryKey: chavesFinanceiro.painel, queryFn: painelFinanceiro });
  const g = useQuery({ queryKey: chavesFinanceiro.graficos, queryFn: graficosFinanceiro });
  const m = useMutacoesFinanceiro();
  const { session } = useSession();
  const remetente =
    ((session?.user.user_metadata?.["full_name"] as string | undefined) ?? "").split(" ")[0] ?? "";
  const [painel, setPainel] = useState<null | "cobranca" | "mensalidade" | "despesa">(null);
  const [despesa, setDespesa] = useState<Despesa | null>(null);
  const [termo, setTermo] = useState("");
  const [receber, setReceber] = useState(false);

  const d = q.data;
  const verRecebidas = mostrarRecebidas === true || filtro === "recebidas";
  const grupos = useMemo<GrupoLista[]>(() => {
    // Só filtro de exibição sobre a lista já carregada; números e somas vêm prontos do banco
    if (!d) return [];
    const t = normalizar(termo.trim());
    const c = d.cobrancas.filter(
      (x) =>
        (!cliente || x.client_id === cliente) &&
        (!t || normalizar(`${x.empresa} ${x.descricao} ${x.projeto ?? ""}`).includes(t)),
    );
    const porGrupo = new Map<GrupoCobranca, CobrancaLinha[]>();
    for (const x of c) {
      if (x.situacao !== "aberta") continue;
      const k = grupoDaCobranca(x, d.hoje);
      porGrupo.set(k, [...(porGrupo.get(k) ?? []), x]);
    }
    const lista: GrupoLista[] = gruposAbertos
      .filter((gr) => filtro === "abertas" || filtro === "recebidas" || gr.id === filtro)
      .map((gr) => ({ ...gr, itens: porGrupo.get(gr.id) ?? [] }));
    if (verRecebidas)
      lista.push({
        id: "recebidas",
        titulo: "Recebidas (6 meses)",
        tom: "ok",
        itens: c.filter((x) => x.situacao === "paga"),
      });
    return lista.filter((gr) => gr.itens.length > 0);
  }, [d, cliente, termo, filtro, verRecebidas]);

  const empresaFiltrada = cliente
    ? (d?.cobrancas.find((x) => x.client_id === cliente)?.empresa ?? "este cliente")
    : null;
  const aberta = cobranca ? (d?.cobrancas.find((c) => c.id === cobranca) ?? null) : null;
  // Abrir a cobrança cria entrada no histórico; fechar pela tela não (RD-9)
  const painelCobranca = usePainelNaUrl(
    (id, o) => void navigate({ search: (s) => ({ ...s, cobranca: id }), ...o }),
  );
  const abrir = (id: string, pagar = false) => {
    setReceber(pagar);
    painelCobranca.abrir(id);
  };
  const irPara = (s: Partial<z.infer<typeof busca>>) =>
    void navigate({ search: (atual) => ({ ...atual, ...s }), replace: true });

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina
        grupo="Gestão"
        titulo="Financeiro"
        acao={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <button
              type="button"
              className={classeBotaoSecundario}
              onClick={() => {
                setDespesa(null);
                setPainel("despesa");
              }}
            >
              <Plus className="size-4" aria-hidden="true" />
              <span className="sm:hidden" aria-hidden="true">
                Despesa
              </span>
              <span className="max-sm:sr-only">Nova despesa</span>
            </button>
            <button
              type="button"
              className={classeAcaoPrincipal}
              onClick={() => setPainel("cobranca")}
            >
              <Plus className="size-4" aria-hidden="true" />
              <span className="sm:hidden" aria-hidden="true">
                Cobrança
              </span>
              <span className="max-sm:sr-only">Nova cobrança</span>
            </button>
          </div>
        }
        abas={
          <Abas<Aba>
            rotulo="Seções do financeiro"
            ativa={aba}
            aoEscolher={(a) => irPara({ aba: a === "cobrancas" ? undefined : a })}
            opcoes={[
              { id: "cobrancas", rotulo: "Cobranças" },
              {
                id: "mensalidades",
                rotulo: "Mensalidades",
                contagem:
                  d && d.numeros.mensalidades_ativas > 0 ? `${moeda(d.numeros.mrr_cents)}/mês` : "",
              },
              {
                id: "despesas",
                rotulo: "Despesas",
                contagem: d ? moeda(d.numeros.despesas_mes_cents) : "",
              },
              { id: "fluxo", rotulo: "Fluxo de caixa" },
            ]}
          />
        }
      />

      {q.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar o financeiro"
          aoTentarDeNovo={() => void q.refetch()}
        />
      ) : !d ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <div className="h-24 animate-pulse rounded-2xl bg-white" />
          <div className="h-72 animate-pulse rounded-2xl bg-white" />
        </div>
      ) : (
        <>
          <FinanceiroNumeros
            n={d.numeros}
            hoje={d.hoje}
            resultado={g.data?.resultado_mes}
            filtro={filtro === "atrasadas" ? "atrasadas" : "todas"}
            aoFiltrar={(f) =>
              irPara({
                aba: undefined,
                filtro: f === "atrasadas" ? "atrasadas" : undefined,
              })
            }
          />
          {d.numeros.avisos_cliente > 0 && (
            <p className="flex items-center gap-3 rounded-2xl bg-sit-info p-4 text-[14.5px] text-sit-info-t">
              <BellRing className="size-5 shrink-0" aria-hidden="true" />
              {d.numeros.avisos_cliente === 1
                ? "1 cliente avisou que já pagou. Confira no banco e registre o pagamento."
                : `${d.numeros.avisos_cliente} clientes avisaram que já pagaram. Confira no banco e registre os pagamentos.`}
            </p>
          )}

          {g.isError ? (
            <EstadoErro
              titulo="Não foi possível carregar os gráficos"
              aoTentarDeNovo={() => void g.refetch()}
            />
          ) : !g.data ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" aria-busy="true">
              <div className="h-80 animate-pulse rounded-2xl bg-white" />
              <div className="h-80 animate-pulse rounded-2xl bg-white" />
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <GraficoEntradasSaidas meses={g.data.meses} />
              <GraficoMensalidades
                meses={g.data.meses}
                planos={g.data.planos}
                mrrCents={d.numeros.mrr_cents}
                ativas={d.numeros.mensalidades_ativas}
              />
            </div>
          )}

          {aba === "cobrancas" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <label className="flex h-11 items-center gap-2 rounded-xl border border-[#DADAD3] bg-white px-3.5 text-hub-suave sm:w-[300px]">
                  <Search className="size-4 shrink-0" aria-hidden="true" />
                  <span className="sr-only">Buscar cliente ou cobrança</span>
                  <input
                    type="search"
                    value={termo}
                    onChange={(e) => setTermo(e.target.value)}
                    placeholder="Buscar cliente ou cobrança"
                    autoComplete="off"
                    className="w-full min-w-0 bg-transparent text-[16px] text-hub-tinta outline-none placeholder:text-hub-suave md:text-[14px]"
                  />
                </label>
                <label className="flex min-h-11 items-center gap-2.5 text-[14px] text-[#2A2D33] sm:ml-auto">
                  <input
                    type="checkbox"
                    checked={verRecebidas}
                    onChange={(e) =>
                      irPara({
                        recebidas: e.target.checked ? true : undefined,
                        filtro: filtro === "recebidas" ? undefined : filtro,
                      })
                    }
                    className="size-[18px] accent-[#0E1013]"
                  />
                  Mostrar recebidas (6 meses)
                </label>
              </div>
              {(empresaFiltrada || filtro === "atrasadas" || filtro === "sem_data") && (
                <p className="flex flex-wrap items-center gap-x-2 text-[14.5px]">
                  {empresaFiltrada ? (
                    <>
                      Só as cobranças de <strong>{empresaFiltrada}</strong>
                      {filtro === "atrasadas"
                        ? " em atraso"
                        : filtro === "sem_data"
                          ? " sem data"
                          : ""}
                      .
                    </>
                  ) : filtro === "atrasadas" ? (
                    "Só as cobranças em atraso."
                  ) : (
                    'Só as partes cobradas "na entrega". Defina o vencimento quando a entrega acontecer.'
                  )}
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center font-medium text-[#1E3FA8] underline"
                    onClick={() => irPara({ cliente: undefined, filtro: undefined })}
                  >
                    Ver todas
                  </button>
                </p>
              )}
              {grupos.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
                  {termo.trim()
                    ? "Nenhuma cobrança com esse nome."
                    : filtro === "atrasadas"
                      ? "Nada atrasado."
                      : filtro === "sem_data"
                        ? "Nenhuma cobrança esperando data."
                        : "Nada a receber. As parcelas aparecem aqui quando um cliente aceita uma proposta."}
                </p>
              ) : (
                <CobrancasLista
                  grupos={grupos}
                  hoje={d.hoje}
                  aoAbrir={(c) => abrir(c.id)}
                  aoReceber={(c) => abrir(c.id, true)}
                />
              )}
            </div>
          )}
          {aba === "mensalidades" && (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                className={`${classeBotaoSecundario} self-start`}
                onClick={() => setPainel("mensalidade")}
              >
                <Plus className="size-4" aria-hidden="true" /> Nova mensalidade
              </button>
              <MensalidadesLista
                itens={d.mensalidades}
                aoMudar={(x, situacao) => m.situacaoMensalidade.mutate({ id: x.id, situacao })}
              />
            </div>
          )}
          {aba === "despesas" && (
            <DespesasLista
              itens={d.despesas}
              anunciosMesCents={d.anuncios_mes_cents}
              aoEditar={(x) => {
                setDespesa(x);
                setPainel("despesa");
              }}
              aoRemover={(x) => m.removerDesp.mutate(x)}
            />
          )}
          {aba === "fluxo" && <FluxoCaixa />}

          <p className="text-[13.5px] text-hub-suave">
            Por enquanto o pagamento é registrado à mão. Multa ({d.regras.multa_pct}%) e juros (
            {d.regras.juros_pct}% ao mês) aparecem só como referência.{" "}
            <Link
              to="/app/configuracoes"
              className="inline-flex min-h-11 items-center underline sm:min-h-0"
            >
              Chave Pix e regras em Configurações
            </Link>
            .
          </p>
        </>
      )}

      <CobrancaPainel
        c={aberta}
        hoje={d?.hoje ?? ""}
        remetente={remetente}
        pagarAoAbrir={receber}
        aoFechar={painelCobranca.fechar}
        aoPagar={(v) => m.pagar.mutate(v)}
        aoDesfazer={(c) => m.desfazer.mutate(c)}
        aoVencimento={(c, data) => m.atualizar.mutate({ id: c.id, campos: { vencimento: data } })}
        aoCancelar={(c, motivo) => m.cancelar.mutate({ id: c.id, motivo })}
      />
      <NovaCobrancaPainel
        aberto={painel === "cobranca"}
        aoMudar={(v) => !v && setPainel(null)}
        aoCriar={(v) => m.nova.mutate(v)}
      />
      <NovaMensalidadePainel
        aberto={painel === "mensalidade"}
        aoMudar={(v) => !v && setPainel(null)}
        aoCriar={(v) => m.mensalidade.mutate(v)}
      />
      <DespesaPainel
        aberto={painel === "despesa"}
        despesa={despesa}
        aoMudar={(v) => !v && setPainel(null)}
        aoSalvar={(v) => m.despesa.mutate(v)}
      />
    </div>
  );
}
