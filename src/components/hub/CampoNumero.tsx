import { useEffect, useId, useState } from "react";

import { numeroBR as numeroDoTexto } from "@/lib/formatar";
import { cn } from "@/lib/utils";

function textoDoNumero(n: number | null, casas: number): string {
  if (n == null) return "";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: casas, useGrouping: false });
}

/**
 * Campo numérico com prefixo (R$) e sufixo (h, %, dias). Guarda o texto enquanto a pessoa digita
 * e só avisa o número. `escala` 100 = o valor externo é em centavos e a tela mostra reais.
 */
export function CampoNumero({
  rotulo,
  valor,
  aoMudar,
  prefixo,
  sufixo,
  ajuda,
  escala = 1,
  casas = 1,
  rotuloOculto = false,
  className,
  placeholder,
  bloqueado,
}: {
  rotulo: string;
  valor: number | null;
  aoMudar: (n: number | null) => void;
  prefixo?: string;
  sufixo?: string;
  ajuda?: string | undefined;
  escala?: number;
  casas?: number;
  rotuloOculto?: boolean;
  className?: string;
  placeholder?: string;
  bloqueado?: boolean;
}) {
  const id = useId();
  const externo = valor == null ? null : valor / escala;
  const [texto, setTexto] = useState(textoDoNumero(externo, casas));

  useEffect(() => {
    // Campo vazio e valor zero/nulo são a mesma coisa: não reescreve enquanto a pessoa apaga.
    if ((numeroDoTexto(texto) ?? 0) !== (externo ?? 0)) setTexto(textoDoNumero(externo, casas));
    // Só sincroniza quando o valor de fora muda (salvar, desfazer, recarregar).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externo]);

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className={cn("text-[14px] font-medium", rotuloOculto && "sr-only")}>
        {rotulo}
      </label>
      <div className="flex h-11 items-center gap-2 rounded-xl border border-[#DADAD3] bg-white px-3 focus-within:border-hub-tinta focus-within:ring-2 focus-within:ring-hub-tinta/10">
        {prefixo && <span className="text-[14px] text-hub-suave">{prefixo}</span>}
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={texto}
          placeholder={placeholder}
          disabled={bloqueado}
          onChange={(e) => {
            setTexto(e.target.value);
            const n = numeroDoTexto(e.target.value);
            aoMudar(n == null ? null : escala === 1 ? n : Math.round(n * escala));
          }}
          size={1}
          className="h-full min-w-0 flex-1 bg-transparent text-base tabular-nums outline-none disabled:text-hub-suave md:text-[15px]"
        />
        {sufixo && <span className="shrink-0 text-[14px] text-hub-suave">{sufixo}</span>}
      </div>
      {ajuda && <p className="text-[13px] text-hub-suave">{ajuda}</p>}
    </div>
  );
}
