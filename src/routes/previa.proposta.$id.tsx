import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { TelaCarregando } from "@/components/feedback/TelaCarregando";
import { FonteCliente, linkGeist } from "@/components/layout/FonteCliente";
import { PaginaProposta } from "@/components/proposta-publica/PaginaProposta";
import { exigirPapel } from "@/lib/acesso";
import { mensagemDeErro } from "@/lib/notify";
import type { PropostaPublica } from "@/lib/propostas";
import { supabase } from "@/lib/supabase";

/** "Ver como o cliente vê": a mesma página do link, montada para o dono, com o aceite desativado. */
export const Route = createFileRoute("/previa/proposta/$id")({
  ssr: false,
  beforeLoad: ({ context, location }) => exigirPapel(context.queryClient, "owner", location.href),
  head: () => ({ meta: [{ title: "Prévia da proposta · Hub Fora do Papel" }], links: [linkGeist] }),
  pendingComponent: () => (
    <FonteCliente>
      <TelaCarregando />
    </FonteCliente>
  ),
  // Mesma página que o cliente vê, com as fontes dele (RD-10).
  component: () => (
    <FonteCliente>
      <Previa />
    </FonteCliente>
  ),
});

function Previa() {
  const { id } = Route.useParams();
  const dados = useQuery({
    queryKey: ["propostas", "previa", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("proposta_previa", { p_id: id });
      if (error) throw error;
      return data as Extract<PropostaPublica, { documento: unknown }>;
    },
  });
  if (dados.isPending) return <TelaCarregando />;
  if (dados.isError)
    return (
      <main className="flex min-h-dvh items-center justify-center bg-hub-fundo p-6 text-center text-[15px]">
        {mensagemDeErro(dados.error)}
      </main>
    );
  return (
    <PaginaProposta
      dados={dados.data}
      previa
      aoAceitar={() => undefined}
      aoRecusar={() => undefined}
    />
  );
}
