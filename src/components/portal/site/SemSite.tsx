import { Link } from "@tanstack/react-router";

import { EstadoErro } from "@/components/hub/EstadoErro";

/**
 * O que a tela do site mostra quando não dá para editar: carregando, erro, sem site ligado
 * ou módulo não contratado (o banco também recusa: PC-3).
 */
export function SemSite({
  motivo,
  aoTentarDeNovo,
  modulo,
}: {
  motivo: "carregando" | "erro" | "sem-site" | "sem-modulo";
  aoTentarDeNovo?: () => void;
  modulo?: string;
}) {
  if (motivo === "carregando")
    return <div className="h-72 animate-pulse rounded-2xl bg-white" aria-busy="true" />;
  if (motivo === "erro")
    return (
      <EstadoErro
        titulo="Não foi possível abrir o seu site"
        aoTentarDeNovo={aoTentarDeNovo ?? (() => undefined)}
      />
    );
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-hub-borda bg-white p-6">
      <p className="text-[15.5px]">
        {motivo === "sem-site"
          ? "Seu site ainda não está ligado ao painel. Quando estiver, você edita por aqui."
          : `${modulo ?? "Esta parte"} não faz parte do que foi contratado para o seu site.`}
      </p>
      <Link
        to="/portal/pedidos"
        search={{ novo: 1 }}
        className="inline-flex h-12 items-center rounded-xl bg-hub-tinta px-5 text-[15px] font-semibold text-white hover:bg-[#2A2E35] max-sm:w-full max-sm:justify-center"
      >
        Falar com a Fora do Papel
      </Link>
    </div>
  );
}
