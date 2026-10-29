import { useState } from "react";

import { ColunaQuadro, Quadro } from "@/components/hub/Quadro";
import { PecaCartao } from "@/components/marketing/PecaCartao";
import { classeAcaoTexto, corColuna } from "@/lib/estilos";
import { colunas, type Coluna, type Etapa, type Peca } from "@/lib/marketing";

const corDa: Record<Coluna, string> = {
  planejamento: corColuna.neutro,
  criacao: corColuna.info,
  aprovacao: corColuna.atencao,
  pronto: corColuna.ok,
  publicado: corColuna.ok,
};

/** Quantos cartões cada coluna mostra antes de "Mostrar todas" (o banco já corta Publicado em 30 dias). */
const VISIVEIS = 12;

/**
 * Quadro de produção (MK-1): 5 colunas com as 9 etapas. No celular as colunas rolam de lado.
 * Colunas longas mostram as 12 primeiras e "Mostrar todas".
 */
export function QuadroProducao({
  itens,
  hoje,
  aoAbrir,
  aoMover,
  aoRemover,
}: {
  itens: Peca[];
  hoje: string;
  aoAbrir: (p: Peca) => void;
  aoMover: (p: Peca, e: Etapa) => void;
  aoRemover: (p: Peca) => void;
}) {
  const [abertas, setAbertas] = useState<Partial<Record<Coluna, boolean>>>({});
  return (
    <Quadro>
      {colunas.map((c, n) => {
        const daColuna = itens.filter((p) => p.coluna === c.id);
        const todas = abertas[c.id] === true;
        const visiveis = todas ? daColuna : daColuna.slice(0, VISIVEIS);
        return (
          <ColunaQuadro
            key={c.id}
            primeira={n === 0}
            titulo={c.titulo}
            descricao={c.descricao}
            total={daColuna.length}
            cor={corDa[c.id]}
            vazia={daColuna.length === 0}
            rodape={
              daColuna.length > VISIVEIS ? (
                <button
                  type="button"
                  aria-expanded={todas}
                  onClick={() => setAbertas((a) => ({ ...a, [c.id]: !todas }))}
                  className={`${classeAcaoTexto} self-start`}
                >
                  {todas ? "Recolher" : `Mostrar as ${daColuna.length} ⌄`}
                </button>
              ) : undefined
            }
          >
            <ul className="flex flex-col gap-2">
              {visiveis.map((p) => (
                <PecaCartao
                  key={p.id}
                  p={p}
                  hoje={hoje}
                  aoAbrir={() => aoAbrir(p)}
                  aoMover={(e) => aoMover(p, e)}
                  aoRemover={() => aoRemover(p)}
                />
              ))}
            </ul>
          </ColunaQuadro>
        );
      })}
    </Quadro>
  );
}
