import type { CSSProperties } from "react";

import type { CapaArtigo } from "@/lib/site";

/** Posição do contorno e do quadrado âmbar em cada desenho (mesmas medidas do site). */
const desenhos: Record<CapaArtigo, [CSSProperties, CSSProperties]> = {
  cv0: [
    { left: "12%", top: "30%", width: 96, height: 96 },
    { left: "calc(12% + 64px)", top: "calc(30% - 24px)", width: 72, height: 72 },
  ],
  cv1: [
    { right: "14%", top: "22%", width: 120, height: 80 },
    { right: "calc(14% + 90px)", top: "calc(22% + 40px)", width: 64, height: 64 },
  ],
  cv2: [
    { left: "30%", top: "18%", width: 84, height: 110 },
    { left: "calc(30% + 56px)", top: "calc(18% + 70px)", width: 80, height: 56 },
  ],
  cv3: [
    { left: "18%", top: "40%", width: 140, height: 70 },
    { left: "calc(18% + 112px)", top: "calc(40% - 30px)", width: 56, height: 56 },
  ],
};

/** Capa do artigo: um dos 4 desenhos do site ou a imagem enviada. */
export function CapaPrevia({ capa }: { capa: string }) {
  const caixa =
    "relative h-[190px] overflow-hidden rounded-[4px] border border-[#d6d6cf] bg-[#f5f5f2]";
  if (/^https:\/\//.test(capa))
    return (
      <div className={caixa}>
        <img src={capa} alt="" className="size-full object-cover" loading="lazy" />
      </div>
    );
  const [contorno, cheio] =
    desenhos[(capa as CapaArtigo) in desenhos ? (capa as CapaArtigo) : "cv0"];
  return (
    <div
      aria-hidden="true"
      className={caixa}
      style={{
        backgroundImage:
          "linear-gradient(rgb(36 72 201 / 0.07) 1px, transparent 1px), linear-gradient(90deg, rgb(36 72 201 / 0.07) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }}
    >
      <span className="absolute rounded-[2px] border-2 border-[#c9c9c2]" style={contorno} />
      <span className="absolute rounded-[2px] bg-[#FFB020]" style={cheio} />
    </div>
  );
}
