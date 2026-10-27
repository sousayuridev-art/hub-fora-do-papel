import { Plus } from "lucide-react";

import { AjudaFormato } from "@/components/site/AjudaFormato";
import { SecaoEditor } from "@/components/site/SecaoEditor";
import { mover, novaSecao, remover, trocar, type SecaoEditor as Secao } from "@/lib/editorArtigo";
import { classeBotaoSecundario } from "@/lib/estilos";

/** Corpo do artigo por seções. */
export function ArtigoSecoes({
  secoes,
  aoMudar,
}: {
  secoes: Secao[];
  aoMudar: (s: Secao[]) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <AjudaFormato />
      {secoes.length === 0 && (
        <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-5 text-[14.5px] text-hub-suave">
          Nenhuma seção ainda. Para publicar, o artigo precisa de pelo menos uma.
        </p>
      )}
      {secoes.map((s, i) => (
        <SecaoEditor
          key={s.chave}
          secao={s}
          indice={i}
          total={secoes.length}
          aoMudar={(nova) => aoMudar(trocar(secoes, i, () => nova))}
          aoMover={(d) => aoMudar(mover(secoes, i, d))}
          aoRemover={() => aoMudar(remover(secoes, i))}
        />
      ))}
      <button
        type="button"
        className={`${classeBotaoSecundario} w-full sm:w-auto sm:self-start`}
        onClick={() => aoMudar([...secoes, novaSecao()])}
      >
        <Plus className="size-4" aria-hidden="true" /> Nova seção
      </button>
    </div>
  );
}
