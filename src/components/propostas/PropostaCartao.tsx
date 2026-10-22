import { Link } from "@tanstack/react-router";

import { corDoTom } from "@/components/propostas/tons";
import { moeda } from "@/lib/formatar";
import { infoDoCartao, type CartaoProposta } from "@/lib/propostas";
import { cn } from "@/lib/utils";

/** Cartão de uma proposta no quadro: cliente e valor, título e o que importa agora. */
export function PropostaCartao({ p }: { p: CartaoProposta }) {
  const info = infoDoCartao(p);
  return (
    <Link
      to="/app/propostas"
      search={(s) => ({ ...s, id: p.id, filtro: undefined })}
      className="flex flex-col gap-2 rounded-[14px] border border-hub-borda bg-white p-3.5 shadow-[0_1px_2px_rgba(14,16,19,0.04)] transition-colors hover:border-[#C9C9C2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-tinta"
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="truncate text-[12.5px] text-hub-suave">{p.empresa}</span>
        <b
          className={cn(
            "shrink-0 text-[14px] font-semibold tabular-nums",
            p.valor_cents === null && "font-normal text-hub-suave",
          )}
        >
          {p.valor_cents === null ? "Sem valor" : moeda(p.valor_cents)}
        </b>
      </span>
      <span
        className={cn(
          "text-[14.5px] font-medium leading-snug",
          !p.titulo && "font-normal text-hub-suave",
        )}
      >
        {p.titulo ?? "Sem título ainda"}
      </span>
      <span className={cn("text-[12.5px]", corDoTom[info.tom])}>{info.texto}</span>
    </Link>
  );
}
