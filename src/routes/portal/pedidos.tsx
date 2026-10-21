import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { FazerPedidoPainel } from "@/components/portal/FazerPedidoPainel";
import { PedidoPortalCartao } from "@/components/portal/PedidoPortalCartao";
import { TituloPortal } from "@/components/portal/TituloPortal";
import { useMutacoesPortal } from "@/components/portal/useMutacoesPortal";
import { chavesPortal, pedidosDoPortal } from "@/lib/portal";

export const Route = createFileRoute("/portal/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos · Portal Fora do Papel" }] }),
  component: Pedidos,
});

const etapas = [
  ["Recebido", "Seu pedido chegou até nós."],
  ["Em análise", "Vemos o que precisa ser feito."],
  [
    "Sem custo ou serviço adicional",
    "Dizemos se entra no que combinamos ou se tem custo. Com custo, você decide antes.",
  ],
  ["Fazendo", "Estamos trabalhando no pedido."],
  ["Pronto", "Mostramos o resultado."],
] as const;

function Pedidos() {
  const q = useQuery({ queryKey: chavesPortal.pedidos, queryFn: pedidosDoPortal });
  const m = useMutacoesPortal();
  const [aberto, setAberto] = useState(false);
  const andamento = q.data?.filter((p) => p.status !== "pronto" && p.status !== "recusado") ?? [];
  const encerrados = q.data?.filter((p) => p.status === "pronto" || p.status === "recusado") ?? [];

  return (
    <div className="flex flex-col gap-8">
      <TituloPortal
        rotulo="Pedidos de ajuste"
        titulo="Peça, acompanhe, receba"
        texto="Qualquer mudança que você quiser começa aqui. Você vê em que etapa cada pedido está, e nada com custo começa sem a sua aprovação."
        acao={
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-hub-tinta px-5 text-[15px] font-semibold text-white md:w-auto"
          >
            <Plus className="size-4" aria-hidden="true" /> Fazer um pedido
          </button>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          {q.isError ? (
            <EstadoErro
              titulo="Não foi possível carregar os pedidos"
              aoTentarDeNovo={() => void q.refetch()}
            />
          ) : !q.data ? (
            <div className="h-48 animate-pulse rounded-2xl bg-white" aria-busy="true" />
          ) : q.data.length === 0 ? (
            <p className="rounded-2xl border border-hub-borda bg-white p-5 text-[15px] text-hub-suave">
              Nenhum pedido ainda. Use "Fazer um pedido" quando quiser mudar algo.
            </p>
          ) : (
            <>
              {andamento.length > 0 && (
                <section aria-labelledby="andamento-t" className="flex flex-col gap-3">
                  <h2
                    id="andamento-t"
                    className="font-rotulo text-[13.5px] font-medium text-hub-suave"
                  >
                    Em andamento · {andamento.length}
                  </h2>
                  {andamento.map((p) => (
                    <PedidoPortalCartao key={p.id} p={p} />
                  ))}
                </section>
              )}
              {encerrados.length > 0 && (
                <section aria-labelledby="encerrados-t" className="flex flex-col gap-3">
                  <h2
                    id="encerrados-t"
                    className="font-rotulo text-[13.5px] font-medium text-hub-suave"
                  >
                    Encerrados · {encerrados.length}
                  </h2>
                  {encerrados.map((p) => (
                    <PedidoPortalCartao key={p.id} p={p} />
                  ))}
                </section>
              )}
            </>
          )}
        </div>

        <aside
          aria-labelledby="como-t"
          className="flex flex-col gap-4 rounded-2xl border border-hub-borda bg-white p-5"
        >
          <div>
            <span className="font-rotulo text-[13.5px] font-medium text-hub-suave">
              Como funciona
            </span>
            <h2 id="como-t" className="font-titulo text-[20px] font-bold">
              Cinco etapas, sempre à vista
            </h2>
          </div>
          <ol className="flex flex-col gap-3">
            {etapas.map(([t, x], i) => (
              <li key={t} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#F1F1EC] font-rotulo text-[13px]">
                  {i + 1}
                </span>
                <span className="flex flex-col">
                  <span className="font-semibold">{t}</span>
                  <span className="text-[14px] text-hub-suave">{x}</span>
                </span>
              </li>
            ))}
          </ol>
        </aside>
      </div>

      <FazerPedidoPainel aberto={aberto} aoMudar={setAberto} aoEnviar={(v) => m.pedido.mutate(v)} />
    </div>
  );
}
