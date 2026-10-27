import { CampoArea } from "@/components/hub/Campo";
import { BotoesMover } from "@/components/site/BotoesMover";
import { CampoContador } from "@/components/site/CampoContador";
import {
  itensDoTexto,
  limites,
  rotuloTipoBloco,
  type BlocoEditor as Bloco,
} from "@/lib/editorArtigo";

/** Um bloco do corpo (parágrafo, lista, passos, dica ou exemplo) com subir, descer e remover. */
export function BlocoEditor({
  bloco,
  indice,
  total,
  aoMudar,
  aoMover,
  aoRemover,
}: {
  bloco: Bloco;
  indice: number;
  total: number;
  aoMudar: (b: Bloco) => void;
  aoMover: (direcao: -1 | 1) => void;
  aoRemover: () => void;
}) {
  const nome = `${rotuloTipoBloco[bloco.tipo].toLowerCase()} ${indice + 1}`;
  const texto = (v: string) => aoMudar({ ...bloco, texto: v });
  const itens = itensDoTexto(bloco.texto).length;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-hub-borda bg-hub-fundo p-3 pt-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-[#2A2D33]">
          {rotuloTipoBloco[bloco.tipo]}
        </span>
        <BotoesMover
          nome={nome}
          indice={indice}
          total={total}
          aoMover={aoMover}
          aoRemover={aoRemover}
        />
      </div>
      {bloco.tipo === "paragrafo" && (
        <CampoContador
          rotulo="Texto do parágrafo"
          valor={bloco.texto}
          aoMudar={texto}
          limite={limites.paragrafo}
          linhas={4}
        />
      )}
      {(bloco.tipo === "lista" || bloco.tipo === "passos") && (
        <CampoArea
          rotulo={bloco.tipo === "lista" ? "Itens da lista" : "Passos, em ordem"}
          valor={bloco.texto}
          aoMudar={texto}
          linhas={4}
          ajuda={`Um item por linha · ${itens} de ${limites.itens} ${itens === 1 ? "item" : "itens"}`}
        />
      )}
      {bloco.tipo === "dica" && (
        <CampoContador
          rotulo="Texto da dica"
          valor={bloco.texto}
          aoMudar={texto}
          limite={limites.dica}
          linhas={3}
          ajuda='No site, a dica começa com "Na prática."'
        />
      )}
      {bloco.tipo === "exemplo" && (
        <>
          <CampoContador
            rotulo="Título do exemplo"
            valor={bloco.titulo}
            aoMudar={(v) => aoMudar({ ...bloco, titulo: v })}
            limite={limites.tituloExemplo}
          />
          <CampoContador
            rotulo="Texto do exemplo"
            valor={bloco.texto}
            aoMudar={texto}
            limite={limites.textoExemplo}
            linhas={4}
          />
        </>
      )}
    </div>
  );
}
