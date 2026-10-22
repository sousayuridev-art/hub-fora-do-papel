import { useMemo, useState } from "react";

import { ColunaQuadro, Quadro, corColuna } from "@/components/hub/Quadro";
import { PropostaCartao } from "@/components/propostas/PropostaCartao";
import type { CartaoProposta, ResumoPropostas, SituacaoProposta } from "@/lib/propostas";

const colunas: { id: SituacaoProposta; titulo: string; descricao: string; cor: string }[] = [
  {
    id: "rascunho",
    titulo: "Rascunhos",
    descricao: "O que falta para enviar",
    cor: corColuna.neutro,
  },
  { id: "enviada", titulo: "Enviadas", descricao: "Esperando resposta", cor: corColuna.info },
  { id: "aceita", titulo: "Aceitas", descricao: "Viraram projeto", cor: corColuna.ok },
  { id: "recusada", titulo: "Recusadas", descricao: "Com o motivo", cor: corColuna.risco },
];

/** Cartões por coluna antes de "Ver mais" (a lista cresce aos poucos, sem pesar a tela). */
const INICIO = 6;
const PASSO = 12;

const classeVerMais =
  "flex min-h-11 items-center self-start rounded-lg px-1 text-[13.5px] font-medium text-sit-info-t hover:text-hub-tinta hover:underline focus-visible:outline-2 focus-visible:outline-hub-tinta";

/** Quadro sem proposta aberta (card RD-5): Rascunhos, Enviadas, Aceitas e Recusadas. */
export function PropostasQuadro({
  cartoes,
  r,
  filtroSemAbrir,
  aoLimparFiltro,
}: {
  cartoes: CartaoProposta[];
  r: ResumoPropostas | undefined;
  filtroSemAbrir: boolean;
  aoLimparFiltro: () => void;
}) {
  const [mostrar, setMostrar] = useState<Record<SituacaoProposta, number>>({
    rascunho: INICIO,
    enviada: INICIO,
    aceita: INICIO,
    recusada: INICIO,
  });

  // Separa os cartões por coluna, na ordem que o banco mandou (sem contas no cliente)
  const porColuna = useMemo(() => {
    const m: Record<SituacaoProposta, CartaoProposta[]> = {
      rascunho: [],
      enviada: [],
      aceita: [],
      recusada: [],
    };
    for (const c of cartoes) {
      if (c.status === "enviada" && filtroSemAbrir && !c.sem_abrir) continue;
      m[c.status].push(c);
    }
    return m;
  }, [cartoes, filtroSemAbrir]);

  return (
    <Quadro className="md:min-h-[480px]">
      {colunas.map((col, n) => {
        const todos = porColuna[col.id];
        const visiveis = todos.slice(0, mostrar[col.id]);
        const faltam = todos.length - visiveis.length;
        const filtrada = col.id === "enviada" && filtroSemAbrir;
        return (
          <ColunaQuadro
            key={col.id}
            primeira={n === 0}
            titulo={col.titulo}
            descricao={filtrada ? "Só as sem abrir há mais de 3 dias" : col.descricao}
            total={filtrada ? todos.length : (r?.[col.id] ?? todos.length)}
            cor={col.cor}
            vazia={todos.length === 0}
            rodape={
              <>
                {faltam > 0 && (
                  <button
                    type="button"
                    className={classeVerMais}
                    onClick={() => setMostrar((m) => ({ ...m, [col.id]: m[col.id] + PASSO }))}
                  >
                    Ver mais {Math.min(PASSO, faltam)}
                  </button>
                )}
                {filtrada && (
                  <button type="button" className={classeVerMais} onClick={aoLimparFiltro}>
                    Mostrar todas as enviadas
                  </button>
                )}
              </>
            }
          >
            <ul className="flex flex-col gap-2.5">
              {visiveis.map((p) => (
                <li key={p.id}>
                  <PropostaCartao p={p} />
                </li>
              ))}
            </ul>
          </ColunaQuadro>
        );
      })}
    </Quadro>
  );
}
