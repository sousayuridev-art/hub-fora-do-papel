import { useId } from "react";
import { Lock } from "lucide-react";

import { classeEntrada } from "@/components/hub/Campo";
import { cn } from "@/lib/utils";

/** Enquanto digita: sem acento, minúsculas, qualquer outro sinal vira hífen. */
const limparEndereco = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-");

/**
 * Endereço do artigo (/artigos/{slug}). Acompanha o título até a pessoa editar.
 * Depois da primeira publicação fica travado: mudar quebraria links já compartilhados.
 */
export function ArtigoEndereco({
  valor,
  aoMudar,
  dominio,
  travado,
}: {
  valor: string;
  aoMudar: (v: string) => void;
  dominio: string;
  travado: boolean;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="flex items-center gap-1.5 text-[14px] font-medium">
        Endereço {travado && <Lock className="size-3.5 text-hub-suave" aria-hidden="true" />}
      </label>
      <div className="flex min-w-0 items-stretch">
        <span className="flex shrink-0 items-center rounded-l-xl border border-r-0 border-[#DADAD3] bg-hub-fundo px-3 text-[14px] text-hub-suave">
          /artigos/
        </span>
        <input
          id={id}
          type="text"
          value={valor}
          onChange={(e) => aoMudar(limparEndereco(e.target.value))}
          readOnly={travado}
          aria-readonly={travado || undefined}
          aria-describedby={`${id}-ajuda`}
          maxLength={80}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className={cn(
            classeEntrada,
            "h-11 rounded-l-none",
            travado && "cursor-not-allowed bg-hub-fundo text-hub-suave",
          )}
        />
      </div>
      <p id={`${id}-ajuda`} className="break-words text-[13px] text-hub-suave">
        {travado
          ? "O endereço não muda depois da primeira publicação, para não quebrar links já compartilhados nem a posição no Google."
          : `Fica ${dominio}/artigos/${valor || "…"}. Só letras minúsculas, números e hífens. Depois de publicar, não muda mais.`}
      </p>
    </div>
  );
}
