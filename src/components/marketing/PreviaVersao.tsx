import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";

import { PreviaModelo } from "@/components/marketing/modelos/PreviaModelo";
import { classeAcaoTexto } from "@/lib/estilos";
import { geraModelo } from "@/lib/modelosMarca";
import {
  ehSlides,
  ehVideo,
  rotuloChamada,
  type Midia,
  type Pilar,
  type Versao,
} from "@/lib/marketing";

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

/** Áreas que a interface da rede cobre nos verticais (150 px em cima e 250 px embaixo, em 1920). */
function AreaSegura() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[7.8%] border-b border-dashed border-white/40 bg-black/20"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[13%] border-t border-dashed border-white/40 bg-black/20"
      />
    </>
  );
}

/** Slides de verdade, um por vez, com contador e setas de 44 px. */
function Carrossel({
  slides,
  links,
  vertical,
  falhou,
}: {
  slides: Midia[];
  links: Record<string, string>;
  vertical: boolean;
  falhou: boolean;
}) {
  const [i, setI] = useState(0);
  const atual = slides[Math.min(i, slides.length - 1)];
  const src = atual?.caminho ? links[atual.caminho] : undefined;
  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative overflow-hidden rounded-xl bg-[#E6E6DF]"
        style={{ aspectRatio: vertical ? "9 / 16" : "4 / 5" }}
      >
        {src ? (
          <img src={src} alt={atual?.titulo ?? ""} className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-[13px] text-hub-suave">
            {falhou ? "Não conseguimos carregar a imagem." : "Carregando…"}
          </span>
        )}
        {atual?.na_lixeira && (
          <span className="absolute inset-x-2 top-2 rounded-md bg-sit-risco px-2 py-1 text-[12.5px] text-sit-risco-t">
            Arquivo na lixeira
          </span>
        )}
      </div>
      {slides.length > 1 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Slide anterior"
            disabled={i === 0}
            onClick={() => setI((n) => n - 1)}
            className="flex size-11 items-center justify-center rounded-lg hover:bg-white disabled:opacity-30"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <span className="text-[13px] tabular-nums text-hub-suave" aria-live="polite">
            {Math.min(i, slides.length - 1) + 1} de {slides.length}
          </span>
          <button
            type="button"
            aria-label="Próximo slide"
            disabled={i >= slides.length - 1}
            onClick={() => setI((n) => n + 1)}
            className="flex size-11 items-center justify-center rounded-lg hover:bg-white disabled:opacity-30"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Peça com os arquivos reais (MK-2). Devolve null quando a versão ainda não tem arquivo. */
function Real({
  v,
  links,
  vertical,
  falhou,
}: {
  v: Versao;
  links: Record<string, string>;
  vertical: boolean;
  falhou: boolean;
}) {
  const midias = v.midias ?? [];
  const video = midias.find((m) => m.papel === "video");
  const capa = midias.find((m) => m.papel === "capa");
  const pdf = midias.find((m) => m.papel === "documento");
  const imagens = midias.filter((m) => m.papel === "slide" || m.papel === "imagem");
  if (video) {
    const src = video.caminho ? links[video.caminho] : undefined;
    const poster = capa?.caminho ? links[capa.caminho] : undefined;
    return (
      <div
        className="relative overflow-hidden rounded-xl bg-[#0E1013]"
        style={{ aspectRatio: vertical ? "9 / 16" : "16 / 9" }}
      >
        {src && (
          <video
            src={src}
            poster={poster}
            className="size-full object-cover"
            muted
            playsInline
            controls
            preload="metadata"
          >
            <track kind="captions" />
          </video>
        )}
        {vertical && <AreaSegura />}
      </div>
    );
  }
  if (imagens.length > 0)
    return <Carrossel slides={imagens} links={links} vertical={vertical} falhou={falhou} />;
  // Só a capa (o vídeo ainda não foi ligado): mostra a capa.
  if (capa) return <Carrossel slides={[capa]} links={links} vertical={vertical} falhou={falhou} />;
  if (pdf) {
    const src = pdf.caminho ? links[pdf.caminho] : undefined;
    return (
      <a
        href={src}
        target="_blank"
        rel="noreferrer noopener"
        aria-disabled={!src}
        className={`${classeAcaoTexto} self-center`}
      >
        <FileText className="size-4" aria-hidden="true" /> Abrir o PDF ›
      </a>
    );
  }
  return null;
}

/**
 * Prévia por canal: com arquivo (MK-2), a peça real (slides, imagem, vídeo com a área segura,
 * PDF); sem arquivo, a capa com o gancho (MK-1). Embaixo, o texto até onde a rede corta.
 */
export function PreviaVersao({
  v,
  links = {},
  falhou = false,
  pilar = null,
}: {
  v: Versao;
  /** Rótulo da capa no modelo da marca (MK-6). */
  pilar?: Pilar | null;
  links?: Record<string, string>;
  falhou?: boolean;
}) {
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
        {(v.midias?.length ?? 0) > 0 ? (
          <Real v={v} links={links} vertical={vertical} falhou={falhou} />
        ) : v.format === "texto" || v.format === "artigo" ? null : geraModelo(v.format) ? (
          <PreviaModelo v={v} pilar={pilar} largura={vertical ? 220 : 300} />
        ) : (
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
