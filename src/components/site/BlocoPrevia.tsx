import { TextoDoSite } from "@/components/site/TextoDoSite";
import type { Bloco } from "@/lib/editorArtigo";

const cartao = "rounded-[4px] border border-[#d6d6cf] bg-white";

/** Um bloco do corpo com as regras de article-body.tsx do site (tema claro). */
export function BlocoPrevia({ bloco, dominio }: { bloco: Bloco; dominio: string }) {
  if (typeof bloco === "string")
    return (
      <p>
        <TextoDoSite t={bloco} dominio={dominio} />
      </p>
    );
  if ("lista" in bloco)
    return (
      <ul className="list-disc pl-6 marker:text-[#2448c9]">
        {bloco.lista.map((item, i) => (
          <li key={i} className="my-2 pl-0.5">
            <TextoDoSite t={item} dominio={dominio} />
          </li>
        ))}
      </ul>
    );
  if ("passos" in bloco)
    return (
      <ol className="list-decimal pl-6 marker:text-[#2448c9]">
        {bloco.passos.map((item, i) => (
          <li key={i} className="my-2 pl-0.5">
            <TextoDoSite t={item} dominio={dominio} />
          </li>
        ))}
      </ol>
    );
  if ("dica" in bloco)
    return (
      <div className={`${cartao} grid grid-cols-[12px_minmax(0,1fr)] gap-3.5 p-[22px] text-[17px]`}>
        <span aria-hidden="true" className="mt-2 size-3 bg-[#FFB020]" />
        <p>
          <strong className="font-semibold text-[#0b0e14]">Na prática.</strong>{" "}
          <TextoDoSite t={bloco.dica} dominio={dominio} />
        </p>
      </div>
    );
  return (
    <aside
      className={`${cartao} flex flex-col gap-2.5 px-6 py-[22px] text-[17px]`}
      aria-label={bloco.exemplo.titulo}
    >
      <p className="font-mono text-[12px] text-[#2448c9]">{bloco.exemplo.titulo.toUpperCase()}</p>
      <p>
        <TextoDoSite t={bloco.exemplo.texto} dominio={dominio} />
      </p>
    </aside>
  );
}
