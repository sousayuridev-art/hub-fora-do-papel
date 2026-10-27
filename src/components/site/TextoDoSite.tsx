import { Fragment } from "react";

import { partesDoTexto } from "@/lib/editorArtigo";

/**
 * Texto com [texto](/caminho) e **destaque**, como no site (article-body.tsx).
 * Na prévia, link interno abre o endereço no site de verdade, em outra aba.
 */
export function TextoDoSite({ t, dominio }: { t: string; dominio: string }) {
  return (
    <>
      {partesDoTexto(t).map((p, i) => (
        <Fragment key={i}>
          {p.tipo === "texto" ? (
            p.texto
          ) : p.tipo === "destaque" ? (
            <strong className="font-semibold text-[#0b0e14]">{p.texto}</strong>
          ) : (
            <a
              href={p.externo ? p.destino : `https://${dominio}${p.destino}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2448c9] underline underline-offset-[3px] hover:text-[#0b0e14]"
            >
              {p.texto}
            </a>
          )}
        </Fragment>
      ))}
    </>
  );
}
