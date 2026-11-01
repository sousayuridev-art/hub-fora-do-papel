import { useEffect, useRef, useState, type CSSProperties } from "react";

import { urlDaFoto } from "@/lib/catalogo";
import type { CapaDoSite as Capa } from "@/lib/sitesHub";
import { Capa as SecaoCapa, type CapaProps } from "@/secoes/Capa";
import { Chamada, type ChamadaProps } from "@/secoes/Chamada";
import { Perguntas, type PerguntasProps } from "@/secoes/Perguntas";
import { Rodape, type RodapeProps } from "@/secoes/Rodape";
import { TextoImagem, type TextoImagemProps } from "@/secoes/TextoImagem";
import { coresDoSite } from "@/secoes/tema";

/** A seção de verdade, com os componentes que vão ao ar (pacote src/secoes). */
function Secao({ tipo, props }: { tipo: string; props: Record<string, unknown> }) {
  switch (tipo) {
    case "Capa":
      return <SecaoCapa {...(props as CapaProps)} />;
    case "TextoImagem":
      return <TextoImagem {...(props as TextoImagemProps)} />;
    case "Perguntas":
      return (
        <Perguntas
          {...(props as PerguntasProps)}
          itens={(props["itens"] as PerguntasProps["itens"]) ?? []}
        />
      );
    case "Chamada":
      return <Chamada {...(props as ChamadaProps)} />;
    case "Rodape":
      return <Rodape {...(props as RodapeProps)} />;
    default:
      return null;
  }
}

/**
 * Miniatura do cartão do site (RD2-8): a primeira seção publicada da página inicial, desenhada
 * em tamanho real (1280 px no computador, 600 px no celular) e reduzida para caber.
 * O site da Fora do Papel mostra o topo publicado. Sem nada publicado, um aviso.
 */
export function CapaDoSite({ capa, altura = 150 }: { capa: Capa | null; altura?: number }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(0);
  const [base, setBase] = useState(1280);
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const medir = () => {
      setLargura(el.getBoundingClientRect().width);
      // no celular as seções usam o layout de celular; 600 px mostra a seção inteira sem ficar ilegível
      setBase(window.innerWidth >= 768 ? 1280 : 600);
    };
    medir();
    const o = new ResizeObserver(medir);
    o.observe(el);
    return () => o.disconnect();
  }, []);
  const escala = largura > 0 ? largura / base : 0;

  const vazio = !capa || (capa.tipo === "secao" && !capa.secao);
  if (capa?.tipo === "foto")
    return (
      <div
        aria-hidden="true"
        className="overflow-hidden border-b border-[#EEF1F5] bg-[#F5F7FA]"
        style={{ height: altura }}
      >
        <img
          src={urlDaFoto(capa.caminho) ?? ""}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
    );
  return (
    <div
      ref={caixa}
      aria-hidden="true"
      className="relative overflow-hidden border-b border-[#EEF1F5] bg-[#F5F7FA]"
      style={{ height: altura }}
    >
      {vazio ? (
        <span className="grid h-full place-items-center text-[13px] text-hub-suave">
          Ainda sem página publicada
        </span>
      ) : escala > 0 ? (
        <div
          inert
          className="pointer-events-none absolute left-0 top-0 origin-top-left select-none"
          style={{ width: base, transform: `scale(${escala})` }}
        >
          {capa.tipo === "secao" && capa.secao ? (
            <div
              className="bg-white font-sans text-neutral-900 antialiased"
              style={
                {
                  "--site-cor": coresDoSite[capa.cor ?? "grafite"]?.cor ?? coresDoSite.grafite.cor,
                  "--site-suave":
                    coresDoSite[capa.cor ?? "grafite"]?.suave ?? coresDoSite.grafite.suave,
                } as CSSProperties
              }
            >
              <Secao tipo={capa.secao.type} props={capa.secao.props} />
            </div>
          ) : capa.tipo === "topo" ? (
            <div className="bg-[#0E1013] px-8 py-10 text-[#F5F5F2] md:px-16 md:py-20">
              {capa.topo.linha && (
                <p className="text-base font-semibold text-[#FFB020] md:text-xl">
                  {capa.topo.linha}
                </p>
              )}
              <p className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight md:mt-6 md:text-7xl">
                {capa.topo.titulo}
              </p>
              {capa.topo.apoio && (
                <p className="mt-4 max-w-3xl text-lg text-[#C9CCD2] md:mt-6 md:text-2xl">
                  {capa.topo.apoio}
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
