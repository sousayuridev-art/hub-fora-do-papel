import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { TelaCarregando } from "@/components/feedback/TelaCarregando";
import { EstadoProposta } from "@/components/proposta-publica/EstadoProposta";
import { PaginaProposta } from "@/components/proposta-publica/PaginaProposta";
import { erro, mensagemDeErro, ok } from "@/lib/notify";
import {
  abrirPropostaPublica,
  aceitarProposta,
  chavesPropostas,
  mensagemDaProposta,
  recusarProposta,
  type DadosAceite,
} from "@/lib/propostas";

/**
 * Proposta pelo link (card S2): sem login. O banco só entrega o documento do link certo
 * (proposta_publica) e registra o aceite (proposta_aceitar). Sucesso só com resposta do banco.
 */
export const Route = createFileRoute("/proposta/$token")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Proposta · Fora do Papel" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  pendingComponent: () => <TelaCarregando />,
  component: PropostaDoCliente,
});

function PropostaDoCliente() {
  const { token } = Route.useParams();
  const qc = useQueryClient();
  const dados = useQuery({
    queryKey: chavesPropostas.publica(token),
    queryFn: () => abrirPropostaPublica(token),
    staleTime: 60_000,
  });

  const aceitar = useMutation({
    mutationFn: (d: DadosAceite) => aceitarProposta(token, d),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: chavesPropostas.publica(token) });
      ok("Aceite registrado. Obrigado pela confiança.");
      document.getElementById("aceite")?.scrollIntoView({ behavior: "smooth" });
    },
    onError: (e, d) =>
      erro(mensagemDaProposta(e) ?? mensagemDeErro(e), { tentarDeNovo: () => aceitar.mutate(d) }),
  });

  const recusar = useMutation({
    mutationFn: (motivo: string) => recusarProposta(token, motivo),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: chavesPropostas.publica(token) });
      ok("Recebemos sua resposta. Obrigado por avisar.");
    },
    onError: (e, motivo) =>
      erro(mensagemDaProposta(e) ?? mensagemDeErro(e), {
        tentarDeNovo: () => recusar.mutate(motivo),
      }),
  });

  if (dados.isPending) return <TelaCarregando />;
  if (dados.isError) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-hub-fundo px-4 text-center">
        <h1 className="font-titulo text-2xl font-bold">Não conseguimos abrir a proposta</h1>
        <p className="max-w-sm text-[15px] text-hub-suave">{mensagemDeErro(dados.error)}</p>
        <button
          type="button"
          onClick={() => void dados.refetch()}
          className="h-12 rounded-xl bg-hub-tinta px-6 text-[15px] font-semibold text-white"
        >
          Tentar de novo
        </button>
      </main>
    );
  }
  const r = dados.data;
  if (r.estado === "invalido") return <EstadoProposta estado="invalido" />;
  if (!("documento" in r))
    return <EstadoProposta estado={r.estado} empresa={r.empresa} responsavel={r.responsavel} />;
  return (
    <PaginaProposta
      dados={r}
      enviando={aceitar.isPending || recusar.isPending}
      aoAceitar={(d) => aceitar.mutate(d)}
      aoRecusar={(m) => recusar.mutate(m)}
    />
  );
}
