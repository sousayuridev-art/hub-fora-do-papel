/**
 * Fontes da marca (MK-6) servidas pelo próprio Hub: Bricolage Grotesque 700/800, Geist 400/500/600
 * e Geist Mono 500 (subconjunto latino, que cobre acentos do português). Nomes próprios ("FDP ...")
 * para não misturar com a Bricolage 600 do Hub. Este arquivo só carrega quando o modelo abre.
 */
import bricolage700 from "@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-700-normal.woff2?url";
import bricolage800 from "@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff2?url";
import geist400 from "@fontsource/geist-sans/files/geist-sans-latin-400-normal.woff2?url";
import geist500 from "@fontsource/geist-sans/files/geist-sans-latin-500-normal.woff2?url";
import geist600 from "@fontsource/geist-sans/files/geist-sans-latin-600-normal.woff2?url";
import mono500 from "@fontsource/geist-mono/files/geist-mono-latin-500-normal.woff2?url";

const FONTES = [
  { familia: "FDP Bricolage", peso: 700, url: bricolage700 },
  { familia: "FDP Bricolage", peso: 800, url: bricolage800 },
  { familia: "FDP Geist", peso: 400, url: geist400 },
  { familia: "FDP Geist", peso: 500, url: geist500 },
  { familia: "FDP Geist", peso: 600, url: geist600 },
  { familia: "FDP Geist Mono", peso: 500, url: mono500 },
];

const regra = (familia: string, peso: number, src: string) =>
  `@font-face{font-family:"${familia}";font-style:normal;font-weight:${peso};font-display:swap;src:url(${src}) format("woff2");}`;

let carregando: Promise<void> | null = null;

/** Põe as fontes na página e espera ficarem prontas (para a prévia e para gerar o PNG). */
export function carregarFontesMarca(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (!carregando) {
    const css = FONTES.map((f) => regra(f.familia, f.peso, f.url)).join("\n");
    const tag = document.createElement("style");
    tag.id = "fdp-fontes-marca";
    tag.textContent = css;
    document.head.appendChild(tag);
    carregando = Promise.all(
      FONTES.map((f) => document.fonts.load(`${f.peso} 40px "${f.familia}"`)),
    ).then(() => undefined);
  }
  return carregando;
}

let embutido: Promise<string> | null = null;

/** As mesmas regras com o arquivo dentro (data:), para o PNG sair com a fonte certa. */
export function cssDasFontesEmbutido(): Promise<string> {
  if (!embutido) {
    embutido = Promise.all(
      FONTES.map(async (f) => {
        const blob = await (await fetch(f.url)).blob();
        const dados = await new Promise<string>((ok, falha) => {
          const r = new FileReader();
          r.onload = () => ok(String(r.result));
          r.onerror = () => falha(r.error);
          r.readAsDataURL(blob);
        });
        return regra(f.familia, f.peso, dados);
      }),
    ).then((regras) => regras.join("\n"));
    embutido.catch(() => {
      embutido = null;
    });
  }
  return embutido;
}
