import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";

import { erro, mensagemDeErro } from "@/lib/notify";
import { chavesPropostas, criarProposta, mensagemDaProposta } from "@/lib/propostas";
import { cn } from "@/lib/utils";

/** "Proposta" na oportunidade: cria o rascunho (ou abre o que já existe) e leva ao editor. */
export function BotaoAbrirProposta({ dealId, className }: { dealId: string; className?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const abrir = useMutation({
    mutationFn: () => criarProposta(dealId),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: chavesPropostas.tudo });
      void navigate({ to: "/app/propostas", search: { id: r.id } });
    },
    onError: (e) =>
      erro(mensagemDaProposta(e) ?? mensagemDeErro(e), { tentarDeNovo: () => abrir.mutate() }),
  });
  return (
    <button
      type="button"
      className={cn(className, "gap-1.5")}
      disabled={abrir.isPending}
      onClick={() => abrir.mutate()}
    >
      <FileText className="size-4" aria-hidden="true" />
      {abrir.isPending ? "Abrindo…" : "Proposta"}
    </button>
  );
}
