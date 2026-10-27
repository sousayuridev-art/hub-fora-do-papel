import { useId, type ReactNode } from "react";

import { classeEntrada } from "@/components/hub/Campo";
import { contagem } from "@/lib/editorArtigo";
import { cn } from "@/lib/utils";

/**
 * Campo com contador de caracteres (título para o Google 60, descrição 155…).
 * O contador fica âmbar perto do limite e vermelho se passar; o banco recusa acima do limite.
 */
export function CampoContador({
  rotulo,
  valor,
  aoMudar,
  limite,
  linhas,
  ajuda,
  placeholder,
  desabilitado = false,
  className,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  limite: number;
  /** Com linhas, vira texto de várias linhas. */
  linhas?: number;
  ajuda?: ReactNode;
  placeholder?: string;
  desabilitado?: boolean;
  className?: string;
}) {
  const id = useId();
  const c = contagem(valor, limite);
  const comum = {
    id,
    value: valor,
    placeholder,
    disabled: desabilitado,
    "aria-describedby": `${id}-conta`,
    "aria-invalid": c.tom === "passou" || undefined,
  };
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[14px] font-medium">
          {rotulo}
        </label>
        <span
          id={`${id}-conta`}
          className={cn(
            "shrink-0 text-[12.5px] tabular-nums",
            c.tom === "passou"
              ? "font-semibold text-sit-risco-t"
              : c.tom === "perto"
                ? "text-sit-atencao-t"
                : "text-hub-suave",
          )}
        >
          <span className="sr-only">Caracteres usados: </span>
          {c.usados} de {c.limite}
        </span>
      </div>
      {linhas ? (
        <textarea
          {...comum}
          rows={linhas}
          onChange={(e) => aoMudar(e.target.value)}
          className={cn(classeEntrada, "py-2.5 leading-relaxed")}
        />
      ) : (
        <input
          {...comum}
          type="text"
          onChange={(e) => aoMudar(e.target.value)}
          className={cn(classeEntrada, "h-11")}
        />
      )}
      {ajuda && <p className="text-[13px] text-hub-suave">{ajuda}</p>}
    </div>
  );
}
