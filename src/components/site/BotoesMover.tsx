import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

const classe =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-hub-suave transition-colors hover:bg-hub-selecao hover:text-hub-tinta disabled:opacity-35 disabled:hover:bg-transparent";

/** Subir, descer e remover (seção ou bloco). Alvos de 44 px. */
export function BotoesMover({
  nome,
  indice,
  total,
  aoMover,
  aoRemover,
}: {
  /** Ex.: "seção Como começar", "parágrafo 2" (para leitores de tela). */
  nome: string;
  indice: number;
  total: number;
  aoMover: (direcao: -1 | 1) => void;
  aoRemover: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center">
      <button
        type="button"
        className={classe}
        disabled={indice === 0}
        onClick={() => aoMover(-1)}
        aria-label={`Subir ${nome}`}
        title="Subir"
      >
        <ArrowUp className="size-[18px]" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={classe}
        disabled={indice === total - 1}
        onClick={() => aoMover(1)}
        aria-label={`Descer ${nome}`}
        title="Descer"
      >
        <ArrowDown className="size-[18px]" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={`${classe} hover:!bg-sit-risco hover:!text-sit-risco-t`}
        onClick={aoRemover}
        aria-label={`Remover ${nome}`}
        title="Remover"
      >
        <Trash2 className="size-[18px]" aria-hidden="true" />
      </button>
    </div>
  );
}
