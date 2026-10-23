import { useEffect, useId, useLayoutEffect, useRef, useState, type ChangeEvent } from "react";

import {
  centavosDoTexto,
  posicaoCursorDinheiro,
  textoDinheiroCompleto,
  textoDinheiroDeCentavos,
  textoDinheiroDigitando,
} from "@/lib/formatar";
import { cn } from "@/lib/utils";

/**
 * Campo de dinheiro do Hub (card RD-12). Recebe e devolve centavos; a conversão fica só aqui.
 * "R$" fixo à esquerda, ponto de milhar enquanto digita, 2 casas ao sair. Apagar tudo = null.
 */
export function CampoDinheiro({
  rotulo,
  valor,
  aoMudar,
  ajuda,
  placeholder,
  bloqueado,
  rotuloOculto = false,
  className,
  permitirNegativo = false,
  sufixo,
}: {
  rotulo: string;
  valor: number | null;
  aoMudar: (centavos: number | null) => void;
  ajuda?: string | undefined;
  placeholder?: string;
  bloqueado?: boolean;
  rotuloOculto?: boolean;
  className?: string;
  permitirNegativo?: boolean;
  /** Unidade depois do valor ("/mês", "/ h"). */
  sufixo?: string;
}) {
  const id = useId();
  const idAjuda = `${id}-ajuda`;
  const opcoes = { permitirNegativo };
  const [texto, setTexto] = useState(() => textoDinheiroDeCentavos(valor));
  const ref = useRef<HTMLInputElement>(null);
  const cursor = useRef<number | null>(null);

  useEffect(() => {
    // Valor de fora zero com campo vazio é a mesma coisa (telas que trocam null por 0):
    // não reescreve "0,00" enquanto a pessoa apaga. Valor de fora null limpa o campo.
    const atual = centavosDoTexto(texto, opcoes);
    if (valor == null ? atual != null : (atual ?? 0) !== valor) {
      setTexto(textoDinheiroDeCentavos(valor));
    }
    // Só sincroniza quando o valor de fora muda (salvar, desfazer, recarregar).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  useLayoutEffect(() => {
    // Recoloca o cursor depois que o ponto de milhar entrou ou saiu do texto.
    const el = ref.current;
    if (el && cursor.current != null && document.activeElement === el) {
      el.setSelectionRange(cursor.current, cursor.current);
    }
    cursor.current = null;
  }, [texto]);

  function mudar(e: ChangeEvent<HTMLInputElement>) {
    const tipo = (e.nativeEvent as InputEvent).inputType ?? "";
    const apagando = tipo.startsWith("delete");
    let cru = e.target.value;
    let pos = e.target.selectionStart ?? cru.length;

    // Apagou só o ponto de milhar: apaga o dígito vizinho, senão o ponto volta e nada muda.
    const digitos = (t: string) => t.replace(/\D/g, "").length;
    if (apagando && digitos(cru) === digitos(texto) && texto[pos] === ".") {
      if (tipo === "deleteContentForward") cru = cru.slice(0, pos) + cru.slice(pos + 1);
      else if (pos > 0) {
        cru = cru.slice(0, pos - 1) + cru.slice(pos);
        pos -= 1;
      }
    }

    const formatado = textoDinheiroDigitando(cru, { permitirNegativo, apagando });
    if (formatado == null) {
      // Número grande demais: recusa e mantém o texto e o cursor de antes.
      const anterior = Math.max(0, pos - (cru.length - texto.length));
      requestAnimationFrame(() => ref.current?.setSelectionRange(anterior, anterior));
      return;
    }
    cursor.current = posicaoCursorDinheiro(cru, pos, formatado, { permitirNegativo, apagando });
    setTexto(formatado);
    aoMudar(centavosDoTexto(formatado, opcoes));
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className={cn("text-[14px] font-medium", rotuloOculto && "sr-only")}>
        {rotulo}
      </label>
      <div className="flex h-11 items-center gap-2 rounded-xl border border-[#DADAD3] bg-white px-3 focus-within:border-hub-tinta focus-within:ring-2 focus-within:ring-hub-tinta/10">
        <span aria-hidden className="shrink-0 select-none text-[14px] text-hub-suave">
          R$
        </span>
        <input
          ref={ref}
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={texto}
          placeholder={placeholder ?? "0,00"}
          disabled={bloqueado}
          aria-describedby={ajuda ? idAjuda : undefined}
          onChange={mudar}
          onBlur={() => setTexto(textoDinheiroCompleto(texto, opcoes))}
          size={1}
          className="h-full min-w-0 flex-1 bg-transparent text-base tabular-nums outline-none placeholder:text-[#9A9DA3] disabled:text-hub-suave md:text-[15px]"
        />
        {sufixo && <span className="shrink-0 text-[14px] text-hub-suave">{sufixo}</span>}
      </div>
      {ajuda && (
        <p id={idAjuda} className="text-[13px] text-hub-suave">
          {ajuda}
        </p>
      )}
    </div>
  );
}
