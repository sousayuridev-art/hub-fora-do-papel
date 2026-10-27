import { Plus } from "lucide-react";

import { BlocoEditor } from "@/components/site/BlocoEditor";
import { BotoesMover } from "@/components/site/BotoesMover";
import { CampoContador } from "@/components/site/CampoContador";
import {
  limites,
  mover,
  novoBloco,
  remover,
  rotuloTipoBloco,
  trocar,
  type SecaoEditor as Secao,
  type TipoBloco,
} from "@/lib/editorArtigo";

const tipos: TipoBloco[] = ["paragrafo", "lista", "passos", "dica", "exemplo"];

/** Uma seção do corpo: título (vira o h2 e o item do sumário) e os blocos em ordem. */
export function SecaoEditor({
  secao,
  indice,
  total,
  aoMudar,
  aoMover,
  aoRemover,
}: {
  secao: Secao;
  indice: number;
  total: number;
  aoMudar: (s: Secao) => void;
  aoMover: (direcao: -1 | 1) => void;
  aoRemover: () => void;
}) {
  const nome = secao.titulo.trim() ? `seção ${secao.titulo.trim()}` : `seção ${indice + 1}`;
  const blocos = (b: Secao["blocos"]) => aoMudar({ ...secao, blocos: b });
  return (
    <section
      aria-label={`Seção ${indice + 1}`}
      className="flex flex-col gap-3 rounded-2xl border border-[#DADAD3] bg-white p-4 pt-2"
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[14.5px] font-semibold">Seção {indice + 1}</h4>
        <BotoesMover
          nome={nome}
          indice={indice}
          total={total}
          aoMover={aoMover}
          aoRemover={aoRemover}
        />
      </div>
      <CampoContador
        rotulo="Título da seção"
        valor={secao.titulo}
        aoMudar={(v) => aoMudar({ ...secao, titulo: v })}
        limite={limites.tituloSecao}
        ajuda={secao.id ? `Âncora no site: #${secao.id}` : undefined}
      />
      {secao.blocos.map((b, i) => (
        <BlocoEditor
          key={b.chave}
          bloco={b}
          indice={i}
          total={secao.blocos.length}
          aoMudar={(novo) => blocos(trocar(secao.blocos, i, () => novo))}
          aoMover={(d) => blocos(mover(secao.blocos, i, d))}
          aoRemover={() => blocos(remover(secao.blocos, i))}
        />
      ))}
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] text-hub-suave">Acrescentar nesta seção</span>
        <div className="flex flex-wrap gap-2">
          {tipos.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => blocos([...secao.blocos, novoBloco(t)])}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#DADAD3] bg-white px-3 text-[14px] font-medium hover:bg-hub-selecao"
            >
              <Plus className="size-4" aria-hidden="true" />
              {rotuloTipoBloco[t]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
