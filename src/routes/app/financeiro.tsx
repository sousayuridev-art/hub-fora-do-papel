import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BellRing, Plus } from "lucide-react";
import { z } from "zod";

import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { FiltrosChip } from "@/components/hub/FiltrosChip";
import { CobrancaPainel } from "@/components/financeiro/CobrancaPainel";
import { CobrancasLista } from "@/components/financeiro/CobrancasLista";
import { DespesaPainel } from "@/components/financeiro/DespesaPainel";
import { DespesasLista } from "@/components/financeiro/DespesasLista";
import { FinanceiroNumeros } from "@/components/financeiro/FinanceiroNumeros";
import { FluxoCaixa } from "@/components/financeiro/FluxoCaixa";
import { MensalidadesLista } from "@/components/financeiro/MensalidadesLista";
import { NovaCobrancaPainel } from "@/components/financeiro/NovaCobrancaPainel";
import { NovaMensalidadePainel } from "@/components/financeiro/NovaMensalidadePainel";
import { useMutacoesFinanceiro } from "@/components/financeiro/useMutacoesFinanceiro";
import { useSession } from "@/hooks/useSession";
import { classeAcaoPrincipal, classeBotaoSecundario } from "@/lib/estilos";
import { dataLocal } from "@/lib/formatar";
import { chavesFinanceiro, painelFinanceiro, type Despesa } from "@/lib/financeiro";
import { cn } from "@/lib/utils";

const abas = ["cobrancas", "mensalidades", "despesas", "fluxo"] as const;
type Aba = (typeof abas)[number];
const filtros = ["abertas", "sem_data", "recebidas"] as const;
type Filtro = (typeof filtros)[number];

const busca = z.object({
  aba: z.enum(abas).optional().catch(undefined),
  filtro: z.enum(filtros).optional().catch(undefined),
  cobranca: z.string().uuid().optional().catch(undefined),
});

export const Route = createFileRoute("/app/financeiro")({
  validateSearch: busca,
  head: () => ({ meta: [{ title: "Financeiro · Hub Fora do Papel" }] }),
  component: Financeiro,
});

const rotulosAba: Record<Aba, string> = {
  cobrancas: "Cobranças",
  mensalidades: "Mensalidades",
  despesas: "Despesas",
  fluxo: "Fluxo de caixa",
};

function Financeiro() {
  const { aba = "cobrancas", filtro = "abertas", cobranca } = Route.useSearch();
  const navigate = Route.useNavigate();
  const q = useQuery({ queryKey: chavesFinanceiro.painel, queryFn: painelFinanceiro });
  const m = useMutacoesFinanceiro();
  const { session } = useSession();
  const remetente =
    ((session?.user.user_metadata?.["full_name"] as string | undefined) ?? "").split(" ")[0] ?? "";
  const [painel, setPainel] = useState<null | "cobranca" | "mensalidade" | "despesa">(null);
  const [despesa, setDespesa] = useState<Despesa | null>(null);

  const d = q.data;
  const grupos = useMemo(() => {
    const c = d?.cobrancas ?? [];
    return {
      abertas: c.filter((x) => x.situacao === "aberta" && x.vencimento !== null),
      sem_data: c.filter((x) => x.situacao === "aberta" && x.vencimento === null),
      recebidas: c.filter((x) => x.situacao === "paga"),
    };
  }, [d?.cobrancas]);
  const aberta = cobranca ? (d?.cobrancas.find((c) => c.id === cobranca) ?? null) : null;
  const abrir = (id: string | undefined) =>
    void navigate({ search: (s) => ({ ...s, cobranca: id }), replace: true });

  const hoje = d
    ? dataLocal(d.hoje).toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina
        grupo="Gestão"
        titulo="Financeiro"
        resumo={d ? `Hoje, ${hoje}. O que entra, o que sai e o que vem pela frente.` : " "}
        acao={
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className={classeBotaoSecundario}
              onClick={() => {
                setDespesa(null);
                setPainel("despesa");
              }}
            >
              <Plus className="size-4" aria-hidden="true" /> Nova despesa
            </button>
            <button
              type="button"
              className={classeAcaoPrincipal}
              onClick={() => setPainel("cobranca")}
            >
              <Plus className="size-4" aria-hidden="true" /> Nova cobrança
            </button>
          </div>
        }
      />

      {q.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar o financeiro"
          aoTentarDeNovo={() => void q.refetch()}
        />
      ) : !d ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <div className="h-28 animate-pulse rounded-2xl bg-white" />
          <div className="h-72 animate-pulse rounded-2xl bg-white" />
        </div>
      ) : (
        <>
          <FinanceiroNumeros n={d.numeros} />
          {d.numeros.avisos_cliente > 0 && (
            <p className="flex items-center gap-3 rounded-2xl bg-sit-info p-4 text-[14.5px] text-sit-info-t">
              <BellRing className="size-5 shrink-0" aria-hidden="true" />
              {d.numeros.avisos_cliente === 1
                ? "1 cliente avisou que já pagou. Confira no banco e registre o pagamento."
                : `${d.numeros.avisos_cliente} clientes avisaram que já pagaram. Confira no banco e registre os pagamentos.`}
            </p>
          )}

          <div
            role="tablist"
            aria-label="Seções do financeiro"
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
                    search: (s) => ({ ...s, aba: a === "cobrancas" ? undefined : a }),
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
                {rotulosAba[a]}
                {a === "mensalidades" && d.numeros.mensalidades_ativas > 0 && (
                  <span className="rounded-md bg-sit-neutro px-1.5 text-[12.5px] tabular-nums">
                    {d.numeros.mensalidades_ativas}
                  </span>
                )}
              </button>
            ))}
          </div>

          {aba === "cobrancas" && (
            <div className="flex flex-col gap-4">
              <FiltrosChip<Filtro>
                rotulo="Situação das cobranças"
                ativo={filtro}
                aoEscolher={(f) =>
                  void navigate({
                    search: (s) => ({ ...s, filtro: f === "abertas" ? undefined : f }),
                    replace: true,
                  })
                }
                opcoes={[
                  { id: "abertas", rotulo: "A receber", contagem: grupos.abertas.length },
                  { id: "sem_data", rotulo: "Sem data", contagem: grupos.sem_data.length },
                  {
                    id: "recebidas",
                    rotulo: "Recebidas (6 meses)",
                    contagem: grupos.recebidas.length,
                  },
                ]}
              />
              {filtro === "sem_data" && grupos.sem_data.length > 0 && (
                <p className="text-[14px] text-hub-suave">
                  Partes cobradas "na entrega". Defina o vencimento quando a entrega acontecer.
                </p>
              )}
              {grupos[filtro].length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
                  {filtro === "abertas"
                    ? "Nada a receber com data. As parcelas aparecem aqui quando um cliente aceita uma proposta."
                    : filtro === "sem_data"
                      ? "Nenhuma cobrança esperando data."
                      : "Nenhum pagamento registrado nos últimos 6 meses."}
                </p>
              ) : (
                <CobrancasLista itens={grupos[filtro]} hoje={d.hoje} aoAbrir={(c) => abrir(c.id)} />
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
            <Link to="/app/configuracoes" className="underline">
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
        aoFechar={() => abrir(undefined)}
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
