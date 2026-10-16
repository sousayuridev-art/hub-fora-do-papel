import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { AdicionalCartao } from "@/components/portal/AdicionalCartao";
import { EntregaCartao } from "@/components/portal/EntregaCartao";
import { TituloPortal } from "@/components/portal/TituloPortal";
import { useMutacoesPortal } from "@/components/portal/useMutacoesPortal";
import { aprovacoesDoPortal, chavesPortal } from "@/lib/portal";

export const Route = createFileRoute("/portal/aprovacoes")({
  head: () => ({ meta: [{ title: "Aprovações · Portal Fora do Papel" }] }),
  component: Aprovacoes,
});

function Aprovacoes() {
  const q = useQuery({ queryKey: chavesPortal.aprovacoes, queryFn: aprovacoesDoPortal });
  const m = useMutacoesPortal();
  const enviando = m.aprovar.isPending || m.ajuste.isPending || m.adicional.isPending;

  const d = q.data;
  const entregasAbertas = d?.entregas.filter((e) => e.status === "aguardando") ?? [];
  const adicionaisAbertos = d?.adicionais.filter((a) => a.status === "aguardando_cliente") ?? [];
  const decididas = [
    ...(d?.entregas.filter((e) => e.status !== "aguardando") ?? []).map((e) => ({
      tipo: "entrega" as const,
      e,
    })),
    ...(d?.adicionais.filter((a) => a.status !== "aguardando_cliente") ?? []).map((a) => ({
      tipo: "adicional" as const,
      a,
    })),
  ];
  const abertas = entregasAbertas.length + adicionaisAbertos.length;

  return (
    <div className="flex flex-col gap-8">
      <TituloPortal
        rotulo="Aprovações"
        titulo="Decisões que dependem de você"
        texto="Tudo o que precisa do seu de acordo fica aqui. Cada decisão é registrada com o seu nome, a data e a hora."
      />
      {q.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar as aprovações"
          aoTentarDeNovo={() => void q.refetch()}
        />
      ) : !d ? (
        <div className="h-64 animate-pulse rounded-2xl bg-white" aria-busy="true" />
      ) : (
        <>
          <section aria-labelledby="abertas-t" className="flex flex-col gap-4">
            <h2
              id="abertas-t"
              className="font-rotulo text-[12.5px] font-semibold uppercase tracking-[0.12em] text-hub-suave"
            >
              Aguardando você · {abertas}
            </h2>
            {abertas === 0 ? (
              <p className="rounded-2xl border border-hub-borda bg-white p-5 text-[15px] text-hub-suave">
                Nada para decidir agora. Quando uma entrega ficar pronta, ela chega aqui.
              </p>
            ) : (
              <>
                {entregasAbertas.map((e) => (
                  <EntregaCartao
                    key={e.id}
                    e={e}
                    enviando={enviando}
                    podeAprovar={d.pode_aprovar}
                    aoAprovar={(c) => m.aprovar.mutate({ id: e.id, comentario: c })}
                    aoPedirAjuste={(c) => m.ajuste.mutate({ id: e.id, comentario: c })}
                  />
                ))}
                {adicionaisAbertos.map((a) => (
                  <AdicionalCartao
                    key={a.id}
                    a={a}
                    enviando={enviando}
                    podeAprovar={d.pode_aprovar}
                    aoDecidir={(aprova, c) =>
                      m.adicional.mutate({ id: a.id, aprova, comentario: c })
                    }
                  />
                ))}
              </>
            )}
          </section>
          {decididas.length > 0 && (
            <section aria-labelledby="decididas-t" className="flex flex-col gap-4">
              <h2
                id="decididas-t"
                className="font-rotulo text-[12.5px] font-semibold uppercase tracking-[0.12em] text-hub-suave"
              >
                Já decididas · {decididas.length}
              </h2>
              {decididas.map((x) =>
                x.tipo === "entrega" ? (
                  <EntregaCartao
                    key={x.e.id}
                    e={x.e}
                    enviando={false}
                    aoAprovar={() => undefined}
                    aoPedirAjuste={() => undefined}
                  />
                ) : (
                  <AdicionalCartao
                    key={x.a.id}
                    a={x.a}
                    enviando={false}
                    aoDecidir={() => undefined}
                  />
                ),
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
