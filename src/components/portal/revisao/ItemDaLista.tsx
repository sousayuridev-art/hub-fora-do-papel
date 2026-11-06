import { Pencil, X } from "lucide-react";

import { nomeDoTipo, type AjusteRascunho } from "@/lib/revisao";

/** Um ajuste na lista (card RS-2, tela 05): número, tipo, onde e o que deve mudar. */
export function ItemDaLista({
  numero,
  ajuste,
  aoEditar,
  aoTirar,
  podeMexer,
}: {
  numero: number;
  ajuste: AjusteRascunho;
  aoEditar: () => void;
  aoTirar: () => void;
  /** Só quem marcou, ou o responsável pelo contrato, muda ou tira. */
  podeMexer: boolean;
}) {
  const resumo =
    ajuste.depois ??
    ajuste.observacao ??
    (ajuste.foto_id ? "Foto nova enviada" : null) ??
    (ajuste.audio_id ? "Explicado em áudio" : ajuste.tipo === "tirar" ? "Tirar esta parte" : "");
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-hub-borda bg-white p-3 pl-3.5">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-hub-tinta text-[13px] font-bold text-white tabular-nums">
        {numero}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-hub-suave">
          {nomeDoTipo(ajuste.tipo)} · {ajuste.secao ?? ajuste.pagina}
          {ajuste.autor && !ajuste.meu ? ` · por ${ajuste.autor}` : ""}
        </p>
        <p className="mt-0.5 line-clamp-2 break-words text-[15px] leading-snug text-hub-tinta">
          {resumo}
        </p>
      </div>
      {podeMexer && (
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={aoEditar}
            aria-label={`Mudar o ajuste ${numero}`}
            className="grid size-11 place-items-center rounded-xl bg-[#F1F1EC] text-hub-tinta"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={aoTirar}
            aria-label={`Tirar o ajuste ${numero} da lista`}
            className="grid size-11 place-items-center rounded-xl text-hub-suave hover:bg-[#F1F1EC]"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </li>
  );
}
