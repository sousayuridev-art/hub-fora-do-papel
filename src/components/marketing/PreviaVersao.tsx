import type { ReactNode } from "react";

import { ehSlides, ehVideo, rotuloChamada, type Versao } from "@/lib/marketing";

/** Quanto de texto cada canal mostra antes do "mais" (aproximado, para o gancho segurar). */
const corte: Record<string, number> = { instagram: 125, linkedin: 210, tiktok: 80, youtube: 100 };

/** TUDO com a etiqueta âmbar da marca (só na prévia; legenda e bio usam só a caixa alta). */
function comTudo(texto: string): ReactNode[] {
  return texto.split(/(\bTUDO\b)/).map((parte, i) =>
    parte === "TUDO" ? (
      <span key={i} className="rounded bg-[#FFB020] px-1 font-bold text-[#0E1013]">
        TUDO
      </span>
    ) : (
      <span key={i}>{parte}</span>
    ),
  );
}

function Capa({ titulo, vertical }: { titulo: string; vertical: boolean }) {
  return (
    <div
      className="relative flex w-full flex-col justify-end overflow-hidden rounded-xl bg-[#0E1013] p-4 text-white"
      style={{
        aspectRatio: vertical ? "9 / 16" : "4 / 5",
        backgroundImage:
          "radial-gradient(120% 80% at 0% 0%, rgba(30,63,168,0.45), transparent 60%), linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
        backgroundSize: "auto, 24px 24px, 24px 24px",
      }}
    >
      {vertical && (
        <>
          {/* Áreas que a interface da rede cobre (150 px em cima e 250 px embaixo, em 1920). */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-[7.8%] border-b border-dashed border-white/25 bg-white/5"
          />
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-[13%] border-t border-dashed border-white/25 bg-white/5"
          />
        </>
      )}
      <p
        className={
          vertical
            ? "relative mb-[16%] font-titulo text-[17px] font-bold leading-tight"
            : "relative font-titulo text-[19px] font-bold leading-tight"
        }
      >
        {titulo ? comTudo(titulo) : <span className="text-white/50">Gancho da peça</span>}
      </p>
      <span className="relative mt-2 font-rotulo text-[11px] text-white/60">@somosforadopapel</span>
    </div>
  );
}

/**
 * Prévia simples por canal (MK-1): capa com o gancho, área segura nos verticais e o texto até
 * onde a rede corta. A prévia com a imagem real chega no MK-2.
 */
export function PreviaVersao({ v }: { v: Versao }) {
  const vertical = ehVideo(v.format) && v.format !== "video_longo";
  const titulo =
    (ehSlides(v.format) ? v.slides[0]?.titulo : null) ||
    (vertical ? v.script[0]?.na_tela : null) ||
    v.hook ||
    "";
  const texto = v.body ?? "";
  const limite = corte[v.channel] ?? 125;
  const visivel = texto.length > limite ? texto.slice(0, limite).trimEnd() : texto;

  return (
    <figure className="flex flex-col gap-3 rounded-2xl border border-hub-borda bg-[#FAFAF7] p-3">
      <div className={vertical ? "mx-auto w-[220px]" : "mx-auto w-full max-w-[300px]"}>
        {v.format === "texto" || v.format === "artigo" ? null : (
          <Capa titulo={titulo} vertical={vertical} />
        )}
      </div>
      <figcaption className="flex flex-col gap-1.5 px-1 text-[14px] leading-relaxed">
        <b className="text-[13px]">Fora do Papel</b>
        {texto ? (
          <p className="whitespace-pre-line break-words">
            {visivel}
            {texto.length > limite && <span className="text-hub-suave">… mais</span>}
          </p>
        ) : (
          <p className="text-hub-suave">O texto aparece aqui.</p>
        )}
        {v.cta && (
          <span className="self-start rounded-lg bg-hub-tinta px-2.5 py-1 text-[13px] font-medium text-white">
            {rotuloChamada[v.cta]}
          </span>
        )}
        <p className="text-[12.5px] text-hub-suave">
          {texto.length > limite
            ? `A rede mostra cerca de ${limite} caracteres antes do “mais”: o começo precisa segurar.`
            : "Texto inteiro aparece sem cortar."}
        </p>
      </figcaption>
    </figure>
  );
}
