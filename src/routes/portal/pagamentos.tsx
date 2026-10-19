import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, MessageSquare, PauseCircle, ShieldCheck } from "lucide-react";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { CobrancasPortal } from "@/components/portal/CobrancasPortal";
import { PagarPix } from "@/components/portal/PagarPix";
import { TituloPortal } from "@/components/portal/TituloPortal";
import type { Cobranca } from "@/lib/financeiro";
import { dataLocal, diaMes, moeda } from "@/lib/formatar";
import { erro, mensagemDeErro, ok } from "@/lib/notify";
import {
  avisarPagamento,
  chavePagamentos,
  pagamentosDoPortal,
  type PagamentosPortal,
} from "@/lib/portal";

export const Route = createFileRoute("/portal/pagamentos")({
  head: () => ({ meta: [{ title: "Pagamentos · Portal Fora do Papel" }] }),
  component: Pagamentos,
});

function Pagamentos() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: chavePagamentos, queryFn: pagamentosDoPortal });
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const avisar = useMutation({
    mutationFn: avisarPagamento,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: chavePagamentos });
      const antes = qc.getQueryData<PagamentosPortal>(chavePagamentos);
      if (antes)
        qc.setQueryData<PagamentosPortal>(chavePagamentos, {
          ...antes,
          cobrancas: antes.cobrancas.map((c) =>
            c.id === id ? { ...c, cliente_avisou_em: new Date().toISOString() } : c,
          ),
        });
      return { antes };
    },
    onSuccess: () =>
      ok("Aviso enviado. Assim que o pagamento for confirmado, o recibo aparece aqui."),
    onError: (e, id, ctx) => {
      if (ctx?.antes) qc.setQueryData(chavePagamentos, ctx.antes);
      erro(mensagemDeErro(e), { tentarDeNovo: () => avisar.mutate(id) });
    },
    // o selo de Pagamentos e o "Precisa de você" também mudam
    onSettled: () => void qc.invalidateQueries({ queryKey: ["portal"] }),
  });

  if (q.isError)
    return (
      <EstadoErro
        titulo="Não foi possível carregar os pagamentos"
        aoTentarDeNovo={() => void q.refetch()}
      />
    );
  if (!q.data)
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <div className="h-16 w-72 animate-pulse rounded-xl bg-white" />
        <div className="h-48 animate-pulse rounded-3xl bg-white" />
      </div>
    );

  const d = q.data;
  const abertas = d.cobrancas.filter((c) => c.situacao === "aberta" && c.vencimento);
  const proxima =
    abertas.slice().sort((a, b) => (a.vencimento ?? "").localeCompare(b.vencimento ?? ""))[0] ??
    null;
  const alvo: Cobranca | null =
    d.cobrancas.find((c) => c.id === escolhida && c.situacao === "aberta") ?? proxima;
  const parcelas = d.cobrancas.filter((c) => c.tipo === "parcela" || c.tipo === "diagnostico");
  const adicionais = d.cobrancas.filter((c) => c.tipo === "adicional");
  const mensais = d.cobrancas.filter((c) => c.tipo === "mensalidade");
  const avulsas = d.cobrancas.filter((c) => c.tipo === "avulsa");
  const pagar = (c: Cobranca) => {
    setEscolhida(c.id);
    requestAnimationFrame(() =>
      document.getElementById("pagar")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };
  const p = d.projeto;
  const pct = p && p.total_cents > 0 ? Math.round((p.pago_cents / p.total_cents) * 100) : null;

  return (
    <div className="flex flex-col gap-8">
      <TituloPortal
        rotulo={p?.nome ?? "Pagamentos"}
        titulo="Pagamentos"
        texto="Tudo o que foi combinado, o que já foi pago e o que vem pela frente. Sem letras miúdas."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section
          aria-label="Resumo do projeto"
          className="flex flex-col gap-5 rounded-3xl bg-hub-tinta p-6 text-white md:p-8"
        >
          {p && p.total_cents > 0 ? (
            <>
              <div className="flex flex-col gap-1">
                <span className="font-rotulo text-[12.5px] uppercase tracking-[0.12em] text-[#C9CBD0]">
                  Total do projeto
                </span>
                <strong className="font-titulo text-[34px] font-bold leading-none tabular-nums md:text-[44px]">
                  {moeda(p.total_cents)}
                </strong>
              </div>
              <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-white/10">
                <span
                  className="block h-full rounded-full bg-[#FFB020]"
                  style={{ width: `${pct ?? 0}%` }}
                />
              </div>
              <dl className="grid grid-cols-2 gap-3 text-[14px] sm:grid-cols-3">
                <div>
                  <dt className="text-[#C9CBD0]">Pago</dt>
                  <dd className="font-semibold tabular-nums">
                    {moeda(p.pago_cents)} {pct !== null ? `(${pct}%)` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#C9CBD0]">Falta</dt>
                  <dd className="font-semibold tabular-nums">
                    {moeda(p.total_cents - p.pago_cents)}
                  </dd>
                </div>
                {p.diagnostico_cents > 0 && (
                  <div>
                    <dt className="text-[#C9CBD0]">Diagnóstico</dt>
                    <dd className="font-semibold tabular-nums">
                      {moeda(p.diagnostico_cents)} pago
                    </dd>
                  </div>
                )}
              </dl>
            </>
          ) : (
            <p className="text-[15px] text-[#C9CBD0]">
              As parcelas do projeto aparecem aqui depois do aceite da proposta.
            </p>
          )}
          {proxima ? (
            <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[14.5px]">
                <span className="text-[#C9CBD0]">Próxima: </span>
                <strong className="tabular-nums">{moeda(proxima.valor_cents)}</strong>
                {proxima.vencimento ? ` · vence ${diaMes(dataLocal(proxima.vencimento))}` : ""}
              </span>
              <button
                type="button"
                onClick={() => pagar(proxima)}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-5 text-[15px] font-semibold text-hub-tinta max-sm:w-full"
              >
                Pagar agora
              </button>
            </div>
          ) : (
            <p className="border-t border-white/10 pt-4 text-[14.5px] text-[#C9CBD0]">
              Nada para pagar agora.
            </p>
          )}
        </section>

        <section
          aria-labelledby="mensal-t"
          className="flex flex-col gap-3 rounded-3xl border border-hub-borda bg-white p-6"
        >
          <span className="font-rotulo text-[12.5px] font-semibold uppercase tracking-[0.12em] text-hub-suave">
            Mensalidade
          </span>
          {d.mensalidade ? (
            <>
              <h2 id="mensal-t" className="font-titulo text-[20px] font-bold">
                Plano {d.mensalidade.plano}
              </h2>
              <p className="text-[14.5px] text-hub-suave">
                Desde{" "}
                {dataLocal(d.mensalidade.inicio).toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
                , vence todo dia {d.mensalidade.dia}. Contrato mínimo de{" "}
                {d.mensalidade.minimo_meses} meses.
                {d.mensalidade.horas_mes
                  ? ` Inclui ${d.mensalidade.horas_mes.toLocaleString("pt-BR")} h de ajustes por mês.`
                  : ""}
                {d.mensalidade.situacao === "pausada" ? " Está pausada." : ""}
              </p>
              <p className="mt-auto flex items-baseline justify-between border-t border-hub-borda pt-3">
                <span className="text-[14.5px]">Por mês</span>
                <strong className="font-titulo text-xl tabular-nums">
                  {moeda(d.mensalidade.valor_cents)}
                </strong>
              </p>
            </>
          ) : d.mensalidade_prevista ? (
            <>
              <h2 id="mensal-t" className="font-titulo text-[20px] font-bold">
                Plano {d.mensalidade_prevista.plano}
              </h2>
              <p className="text-[14.5px] text-hub-suave">
                Começa depois do lançamento
                {d.mensalidade_prevista.lancamento
                  ? `, previsto para ${diaMes(dataLocal(d.mensalidade_prevista.lancamento))}`
                  : ""}
                . Até lá, nada é cobrado por mês.
              </p>
              {d.mensalidade_prevista.valor_cents ? (
                <p className="mt-auto flex items-baseline justify-between border-t border-hub-borda pt-3">
                  <span className="text-[14.5px]">Por mês</span>
                  <strong className="font-titulo text-xl tabular-nums">
                    {moeda(d.mensalidade_prevista.valor_cents)}
                  </strong>
                </p>
              ) : null}
            </>
          ) : (
            <p id="mensal-t" className="text-[14.5px] text-hub-suave">
              Nenhuma mensalidade combinada.
            </p>
          )}
        </section>
      </div>

      {alvo && (
        <PagarPix
          c={alvo}
          pix={d.pix}
          responsavel={d.responsavel}
          enviando={avisar.isPending}
          aoAvisar={() => avisar.mutate(alvo.id)}
        />
      )}

      <CobrancasPortal
        titulo="Parcelas do projeto"
        apoio={
          parcelas.length
            ? `${parcelas.length} ${parcelas.length === 1 ? "item" : "itens"}`
            : undefined
        }
        itens={parcelas}
        hoje={d.hoje}
        selecionada={alvo?.id ?? null}
        aoPagar={pagar}
      />
      <CobrancasPortal
        titulo="Serviços adicionais"
        apoio="Sempre 50% na aprovação e 50% na entrega"
        itens={adicionais}
        hoje={d.hoje}
        selecionada={alvo?.id ?? null}
        aoPagar={pagar}
      />
      <CobrancasPortal
        titulo="Mensalidades"
        itens={mensais}
        hoje={d.hoje}
        selecionada={alvo?.id ?? null}
        aoPagar={pagar}
      />
      <CobrancasPortal
        titulo="Outras cobranças"
        itens={avulsas}
        hoje={d.hoje}
        selecionada={alvo?.id ?? null}
        aoPagar={pagar}
      />
      {d.cobrancas.length === 0 && (
        <p className="rounded-2xl border border-hub-borda bg-white p-5 text-[15px] text-hub-suave">
          Nenhuma cobrança ainda. Elas aparecem aqui assim que forem combinadas.
        </p>
      )}

      <section
        aria-labelledby="atraso-t"
        className="grid gap-6 rounded-3xl border border-hub-borda bg-white p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:p-8"
      >
        <div className="flex flex-col gap-2">
          <span className="font-rotulo text-[12.5px] font-semibold uppercase tracking-[0.12em] text-hub-suave">
            Com calma e por escrito
          </span>
          <h2 id="atraso-t" className="font-titulo text-[20px] font-bold md:text-2xl">
            Se um pagamento atrasar
          </h2>
          <p className="text-[14.5px] text-hub-suave">
            Acontece. Por isso deixamos claro o que muda em cada dia, e o que nunca muda: o seu site
            continua no ar.
          </p>
        </div>
        <ol className="flex flex-col gap-4">
          {[
            [
              CalendarClock,
              "No dia do vencimento",
              "Lembramos você aqui no portal. Pagou, o recibo aparece nesta página.",
            ],
            [
              MessageSquare,
              "A partir do 1º dia de atraso",
              `Valem multa de ${d.regras.multa_pct}% e juros de ${d.regras.juros_pct}% ao mês, contados por dia. Combinamos tudo por escrito.`,
            ],
            [
              PauseCircle,
              "A partir do 10º dia",
              "O trabalho novo pode ser pausado até o pagamento. Ao pagar, retomamos de onde paramos.",
            ],
            [
              ShieldCheck,
              "Sempre",
              "O que está no ar continua no ar. Nunca tiramos o seu site do ar por atraso.",
            ],
          ].map(([Icone, t, x]) => {
            const I = Icone as typeof CalendarClock;
            return (
              <li key={t as string} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-hub-fundo">
                  <I className="size-4" aria-hidden="true" />
                </span>
                <span className="flex flex-col">
                  <span className="font-semibold">{t as string}</span>
                  <span className="text-[14.5px] text-hub-suave">{x as string}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
