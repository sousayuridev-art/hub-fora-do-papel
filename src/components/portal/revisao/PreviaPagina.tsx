import {
  createContext,
  useContext,
  useMemo,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { CustomField } from "@puckeditor/core";

import type { DadosPagina } from "@/lib/paginasCliente";
import { posicaoNaSecao, textoDoToque, type Posicao } from "@/lib/revisao";
import { coresDoSite, type CorDoSite } from "@/secoes/tema";
import { criarConfigSecoes, sobreAsSecoes, type TipoSecao } from "@/secoes/config";

/** Pino numerado sobre o site: preto quando já está na lista, âmbar quando acabou de ser tocado. */
export type Pino = { numero: number; secaoId: string; posicao: Posicao; novo?: boolean };

/** O que a pessoa tocou: a seção, o lugar dentro dela e o que estava ali. */
export type Toque = {
  secaoId: string;
  secao: string;
  posicao: Posicao;
  antes: string | null;
  /** Endereço da foto tocada (para "Trocar foto"). */
  foto: string | null;
};

const PinosContexto = createContext<Pino[]>([]);

// O campo de foto só existe no editor; aqui a página é só para ver e tocar
const campoFoto: CustomField<string> = { type: "custom", render: () => <></> };

function Secao({ id, tipo, children }: { id: string; tipo: TipoSecao; children: ReactNode }) {
  const pinos = useContext(PinosContexto).filter((p) => p.secaoId === id);
  return (
    <div
      data-secao-id={id}
      data-secao-nome={sobreAsSecoes[tipo]?.nome ?? "Parte da página"}
      className="relative cursor-pointer outline-offset-[-3px] hover:outline-2 hover:outline-dashed hover:outline-[#FFB020]"
    >
      {children}
      {pinos.map((p) => (
        <span
          key={`${p.numero}-${p.secaoId}`}
          aria-hidden="true"
          className={
            p.novo
              ? "pointer-events-none absolute z-10 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#FFB020] text-[14px] font-bold text-hub-tinta shadow-[0_0_0_3px_#fff,0_0_0_9px_rgba(255,176,32,0.3)]"
              : "pointer-events-none absolute z-10 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-hub-tinta text-[14px] font-bold text-white shadow-[0_0_0_3px_#fff,0_6px_14px_-6px_rgba(14,16,19,0.6)]"
          }
          style={{ left: `${p.posicao.x * 100}%`, top: `${p.posicao.y * 100}%` }}
        >
          {p.numero}
        </span>
      ))}
    </div>
  );
}

/**
 * Página do site desenhada pelo próprio Hub, com as seções do editor (card PC-4), para a revisão
 * (card RS-2). Cada seção leva `data-secao-id`; o toque grava a seção e a posição em porcentagem,
 * e os links não navegam. O pino cai no mesmo lugar no celular e no computador.
 */
export function PreviaPagina({
  dados,
  pinos,
  aoTocar,
}: {
  dados: DadosPagina;
  pinos: Pino[];
  aoTocar: (t: Toque) => void;
}) {
  const config = useMemo(() => criarConfigSecoes({ campoFoto }), []);
  const cor = (dados.root?.props as { cor?: CorDoSite } | undefined)?.cor ?? "grafite";
  const tema = coresDoSite[cor] ?? coresDoSite.grafite;

  function tocar(e: MouseEvent<HTMLDivElement>) {
    // Na revisão, tocar marca; nada abre nem navega
    e.preventDefault();
    e.stopPropagation();
    const alvo = e.target as HTMLElement;
    const secao = alvo.closest<HTMLElement>("[data-secao-id]");
    if (!secao) return;
    const caixa = secao.getBoundingClientRect();
    const img = alvo.closest("img");
    aoTocar({
      secaoId: secao.dataset["secaoId"] ?? "",
      secao: secao.dataset["secaoNome"] ?? "Parte da página",
      posicao: posicaoNaSecao({ x: e.clientX, y: e.clientY }, caixa),
      antes: img ? null : textoDoToque(alvo.innerText || alvo.textContent),
      foto: img ? img.currentSrc || img.src : null,
    });
  }

  return (
    <PinosContexto.Provider value={pinos}>
      <div
        onClickCapture={tocar}
        className="min-h-full bg-white font-sans text-neutral-900 antialiased"
        style={{ "--site-cor": tema.cor, "--site-suave": tema.suave } as CSSProperties}
      >
        {dados.content.map((item) => {
          const tipo = item.type as TipoSecao;
          const comp = config.components[tipo] as
            { render: (p: Record<string, unknown>) => ReactNode } | undefined;
          if (!comp) return null;
          const props = item.props as Record<string, unknown> & { id: string };
          const Desenho = comp.render;
          return (
            <Secao key={props.id} id={props.id} tipo={tipo}>
              <Desenho {...props} />
            </Secao>
          );
        })}
      </div>
    </PinosContexto.Provider>
  );
}
