import { forwardRef, type CSSProperties } from "react";

import { altura, LARGURA, partesComTudo, type Quadro } from "@/lib/modelosMarca";

/**
 * Um quadro no desenho da marca (MK-6), no tamanho real (1080 × 1350 ou 1080 × 1920).
 * Medidas, cores e fontes da skill marca-fora-do-papel; tudo em px fixos para o PNG sair igual.
 * Para miniaturas, use `QuadroEscalado`.
 */
const COR = {
  escuro: "#0E1013",
  claro: "#F5F5F2",
  ambar: "#FFB020",
  apoioEscuro: "#C9C9C2",
  apoioClaro: "#4A4D54",
  rotuloClaro: "#1E3FA8",
};
const TITULO = '"FDP Bricolage", "Bricolage Grotesque", system-ui, sans-serif';
const TEXTO = '"FDP Geist", Geist, system-ui, sans-serif';
const MONO = '"FDP Geist Mono", ui-monospace, monospace';

function cores(tema: Quadro["tema"]) {
  if (tema === "escuro")
    return {
      fundo: COR.escuro,
      tinta: "#FFFFFF",
      apoio: COR.apoioEscuro,
      // Âmbar só no símbolo: o rótulo da capa escura fica no apoio claro.
      rotulo: COR.apoioEscuro,
      quadrado: COR.ambar,
    };
  if (tema === "claro")
    return {
      fundo: COR.claro,
      tinta: COR.escuro,
      apoio: COR.apoioClaro,
      rotulo: COR.rotuloClaro,
      quadrado: COR.ambar,
    };
  // No fundo âmbar, o quadrado do símbolo vira escuro (nunca âmbar sobre âmbar).
  return {
    fundo: COR.ambar,
    tinta: COR.escuro,
    apoio: "#2A2D33",
    rotulo: COR.escuro,
    quadrado: COR.escuro,
  };
}

/** Símbolo: papel em contorno + quadrado saindo pelo canto (grade de 30). */
function Simbolo({
  tamanho,
  traco,
  quadrado,
}: {
  tamanho: number;
  traco: string;
  quadrado: string;
}) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 30 30" aria-hidden="true">
      <rect x="2" y="8" width="18" height="18" fill="none" stroke={traco} strokeWidth="2.4" />
      <rect x="16" y="2" width="12" height="12" fill={quadrado} />
    </svg>
  );
}

function Assinatura({ c }: { c: ReturnType<typeof cores> }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <Simbolo tamanho={44} traco={c.tinta} quadrado={c.quadrado} />
      <span
        style={{
          fontFamily: TITULO,
          fontWeight: 800,
          fontSize: 34,
          letterSpacing: "-0.03em",
          color: c.tinta,
          lineHeight: 1,
        }}
      >
        fora do papel
      </span>
    </div>
  );
}

/** Texto com TUDO como etiqueta (âmbar; no fundo âmbar, escura com texto âmbar). */
function ComTudo({ texto, tema }: { texto: string; tema: Quadro["tema"] }) {
  const etiqueta: CSSProperties =
    tema === "ambar"
      ? { background: COR.escuro, color: COR.ambar }
      : { background: COR.ambar, color: COR.escuro };
  return (
    <>
      {partesComTudo(texto).map((p, i) =>
        p.tudo ? (
          <span key={i} style={{ ...etiqueta, padding: "0 0.18em", borderRadius: "0.12em" }}>
            TUDO
          </span>
        ) : (
          <span key={i}>{p.texto}</span>
        ),
      )}
    </>
  );
}

export const QuadroMarca = forwardRef<HTMLDivElement, { q: Quadro }>(function QuadroMarca(
  { q },
  ref,
) {
  const c = cores(q.tema);
  const h = altura(q.vertical);
  // Verticais: 150 px em cima e 250 px embaixo ficam sob a interface da rede.
  const topo = q.vertical ? 150 + 40 : 88;
  const base = q.vertical ? 250 + 40 : 88;
  const fundo: CSSProperties =
    q.tema === "escuro"
      ? {
          backgroundColor: COR.escuro,
          backgroundImage:
            "radial-gradient(120% 80% at 0% 0%, rgba(30,63,168,0.30), transparent 60%), linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "auto, 48px 48px, 48px 48px",
        }
      : { backgroundColor: c.fundo };
  const titulo = q.tamanhoTitulo ?? 60;
  const texto = q.tamanhoTexto ?? 34;

  return (
    <div
      ref={ref}
      style={{
        ...fundo,
        width: LARGURA,
        height: h,
        boxSizing: "border-box",
        padding: `${topo}px 96px ${base}px`,
        display: "flex",
        flexDirection: "column",
        color: c.tinta,
        fontFamily: TEXTO,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {q.tipo === "capa" && <Assinatura c={c} />}

      <div
        data-medir="area"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: q.tipo === "capa" ? "flex-end" : "center",
          alignItems: q.tipo === "capa" ? "flex-start" : "center",
          textAlign: q.tipo === "capa" ? "left" : "center",
          gap: 32,
          paddingBottom: q.tipo === "capa" ? 40 : 0,
        }}
      >
        {q.tipo === "capa" && q.rotulo && (
          <span
            style={{
              fontFamily: MONO,
              fontWeight: 500,
              fontSize: 26,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: c.rotulo,
            }}
          >
            {q.rotulo}
          </span>
        )}
        {q.titulo && (
          <h1
            data-medir="linha"
            style={{
              margin: 0,
              fontFamily: TITULO,
              fontWeight: 800,
              fontSize: titulo,
              lineHeight: 1.04,
              letterSpacing: "-0.02em",
              maxWidth: 888,
            }}
          >
            <ComTudo texto={q.titulo} tema={q.tema} />
          </h1>
        )}
        {q.texto && (
          <p
            data-medir="linha"
            style={{
              margin: 0,
              fontSize: texto,
              lineHeight: 1.35,
              color: q.tipo === "capa" ? c.apoio : c.tinta,
              maxWidth: 820,
              whiteSpace: "pre-line",
            }}
          >
            <ComTudo texto={q.texto} tema={q.tema} />
          </p>
        )}
        {q.tipo === "final" && q.chamada && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
              marginTop: 16,
            }}
          >
            <span
              style={{
                background: q.tema === "ambar" ? COR.escuro : COR.ambar,
                color: q.tema === "ambar" ? "#FFFFFF" : COR.escuro,
                fontWeight: 600,
                fontSize: 40,
                padding: "26px 52px",
                borderRadius: 20,
              }}
            >
              {q.chamada}
            </span>
            <span style={{ fontSize: 30, color: c.apoio }}>Link na bio</span>
          </div>
        )}
        {q.arraste && (
          <span style={{ fontSize: 30, fontWeight: 500, color: c.apoio }}>
            Arraste para o lado →
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: q.tipo === "capa" ? "space-between" : "center",
          alignItems: "center",
          fontFamily: MONO,
          fontWeight: 500,
          fontSize: 24,
          letterSpacing: "0.08em",
          color: c.apoio,
        }}
      >
        {q.tipo === "capa" && <span>foradopapel.com.br</span>}
        {q.total > 1 && (
          <span>
            {q.indice}/{q.total}
          </span>
        )}
      </div>
    </div>
  );
});

/** Miniatura: o mesmo quadro reduzido para a largura pedida. */
export function QuadroEscalado({ q, largura }: { q: Quadro; largura: number }) {
  const escala = largura / LARGURA;
  const h = altura(q.vertical);
  return (
    <div
      style={{ width: largura, height: h * escala, overflow: "hidden", borderRadius: 10 }}
      aria-label={`${q.tipo === "capa" ? "Capa" : q.tipo === "final" ? "Chamada final" : `Slide ${q.indice}`}: ${q.titulo || "sem título"}`}
      role="img"
    >
      <div
        style={{
          transform: `scale(${escala})`,
          transformOrigin: "top left",
          width: LARGURA,
          height: h,
        }}
      >
        <QuadroMarca q={q} />
      </div>
    </div>
  );
}
