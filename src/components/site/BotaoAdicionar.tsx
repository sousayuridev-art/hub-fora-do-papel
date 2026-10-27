import { Plus } from "lucide-react";

/** "Adicionar…" das listas das páginas. Some o motivo quando chega no limite. */
export function BotaoAdicionar({
  rotulo,
  aoAdicionar,
  limite,
  total,
}: {
  rotulo: string;
  aoAdicionar: () => void;
  limite: number;
  total: number;
}) {
  const cheio = total >= limite;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={aoAdicionar}
        disabled={cheio}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#DADAD3] bg-white px-4 text-[15px] font-medium hover:bg-hub-selecao disabled:opacity-50"
      >
        <Plus className="size-4" aria-hidden="true" /> {rotulo}
      </button>
      <span className="text-[13px] text-hub-suave">
        {total} de {limite}
        {cheio ? " (limite)" : ""}
      </span>
    </div>
  );
}
