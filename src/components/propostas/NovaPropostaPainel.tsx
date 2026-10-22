import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";

import { PainelLateral } from "@/components/hub/PainelLateral";
import { Selo } from "@/components/hub/Selo";
import { chavesFunil, listarFunil, rotuloEtapa } from "@/lib/funil";
import { moeda } from "@/lib/formatar";
import { erro, mensagemDeErro } from "@/lib/notify";
import {
  chavesPropostas,
  criarProposta,
  mensagemDaProposta,
  type PropostaLinha,
} from "@/lib/propostas";

/** Nova proposta: escolhe uma oportunidade aberta que ainda não tem proposta em andamento. */
export function NovaPropostaPainel({
  aberto,
  aoMudar,
  propostas,
}: {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  propostas: Pick<PropostaLinha, "status" | "deal_id">[];
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [texto, setTexto] = useState("");
  const funil = useQuery({
    queryKey: chavesFunil.lista("todos"),
    queryFn: () => listarFunil("todos"),
    enabled: aberto,
  });
  const comProposta = useMemo(
    () =>
      new Set(
        propostas
          .filter((p) => p.status === "rascunho" || p.status === "enviada")
          .map((p) => p.deal_id),
      ),
    [propostas],
  );
  const termo = texto.trim().toLowerCase();
  const opcoes = (funil.data ?? []).filter(
    (o) =>
      o.stage !== "fechado" &&
      !comProposta.has(o.id) &&
      (!termo || `${o.company_name} ${o.contact_name}`.toLowerCase().includes(termo)),
  );

  const criar = useMutation({
    mutationFn: (dealId: string) => criarProposta(dealId),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: chavesPropostas.tudo });
      aoMudar(false);
      void navigate({ to: "/app/propostas", search: { id: r.id } });
    },
    onError: (e, dealId) =>
      erro(mensagemDaProposta(e) ?? mensagemDeErro(e), {
        tentarDeNovo: () => criar.mutate(dealId),
      }),
  });

  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Nova proposta"
      descricao="Escolha a oportunidade. A proposta usa os dados da ficha e o diagnóstico pago, se houver."
    >
      <label className="relative mb-4 block">
        <span className="sr-only">Buscar empresa ou pessoa</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-hub-suave"
          aria-hidden="true"
        />
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar empresa ou pessoa"
          className="h-11 w-full rounded-xl border border-[#DADAD3] pl-9 pr-3 text-base md:text-[15px]"
        />
      </label>
      {funil.isPending ? (
        <div className="h-40 animate-pulse rounded-xl bg-hub-fundo" aria-busy="true" />
      ) : funil.isError ? (
        <p className="text-[14.5px] text-sit-risco-t">
          Não foi possível carregar o funil. Feche e abra de novo.
        </p>
      ) : opcoes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#D6D6CF] p-4 text-[14.5px] text-hub-suave">
          Nenhuma oportunidade aberta sem proposta. Crie o contato no funil primeiro.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {opcoes.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                disabled={criar.isPending}
                onClick={() => criar.mutate(o.id)}
                className="flex w-full flex-col gap-1 rounded-xl border border-hub-borda p-3.5 text-left hover:border-hub-tinta"
              >
                <span className="flex justify-between gap-2">
                  <span className="font-semibold">{o.company_name}</span>
                  <span className="text-[14px] tabular-nums text-hub-suave">
                    {moeda(o.value_cents)}
                  </span>
                </span>
                <span className="text-[13.5px] text-hub-suave">{o.contact_name}</span>
                <span className="self-start">
                  <Selo tom="neutro">{rotuloEtapa[o.stage]}</Selo>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </PainelLateral>
  );
}
