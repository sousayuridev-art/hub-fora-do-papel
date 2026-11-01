import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Eye } from "lucide-react";

import { abrirEspelho, fecharEspelho, type Espelho, type PerfilEspelho } from "@/lib/espelho";
import { erro, mensagemDeErro } from "@/lib/notify";

/**
 * Faixa do "Ver como o cliente" (card RD2-8), presa ao topo do portal: diz que é modo leitura,
 * troca entre responsável e equipe e volta ao Hub.
 */
export function FaixaEspelho({ espelho }: { espelho: Espelho }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const trocar = useMutation({
    mutationFn: (perfil: PerfilEspelho) =>
      abrirEspelho({ clienteId: espelho.clienteId, siteId: espelho.siteId, perfil }),
    onSuccess: () => qc.clear(),
    onError: (e) => erro(`Não foi possível trocar o perfil. ${mensagemDeErro(e)}`),
  });
  const voltar = () => {
    fecharEspelho();
    qc.clear();
    if (espelho.siteId) void navigate({ to: "/app/sites/$id", params: { id: espelho.siteId } });
    else void navigate({ to: "/app/clientes/$id", params: { id: espelho.clienteId } });
  };

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-[#FFB020] px-4 py-2 text-[14px] text-hub-tinta md:px-6"
    >
      <span className="flex min-w-0 items-center gap-2">
        <Eye className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0">
          <b className="font-semibold">
            Você está vendo o portal {espelho.empresa ? `da ${espelho.empresa}` : "do cliente"} como{" "}
            {espelho.perfil === "responsavel" ? "o responsável" : "a equipe"} vê.
          </b>{" "}
          <span className="max-sm:hidden">Modo leitura: nada pode ser alterado aqui.</span>
        </span>
      </span>
      <span className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-[13.5px]">
          <span className="max-sm:sr-only">Ver como</span>
          <select
            value={espelho.perfil}
            disabled={trocar.isPending}
            onChange={(e) => trocar.mutate(e.target.value as PerfilEspelho)}
            className="h-9 rounded-lg border border-black/25 bg-white px-2 text-base font-medium md:text-[13.5px]"
          >
            <option value="responsavel">Responsável</option>
            <option value="equipe">Equipe (sem valores)</option>
          </select>
        </label>
        <button
          type="button"
          onClick={voltar}
          className="inline-flex h-9 items-center rounded-lg bg-hub-tinta px-3.5 text-[13.5px] font-medium text-white"
        >
          Voltar ao Hub
        </button>
      </span>
    </div>
  );
}
