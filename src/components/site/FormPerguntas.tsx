import { BotaoAdicionar } from "@/components/site/BotaoAdicionar";
import { CampoContador } from "@/components/site/CampoContador";
import { ItemPagina } from "@/components/site/ItemPagina";
import { mover, remover, trocar } from "@/lib/editorArtigo";
import {
  gruposPerguntas,
  LIMITES,
  type BlocoPergunta,
  type GrupoPergunta,
} from "@/lib/paginasSite";

/**
 * Perguntas frequentes (card CMS-4). Todas vão para /perguntas, no grupo escolhido;
 * as marcadas aparecem também na página inicial, na ordem da lista.
 */
export function FormPerguntas({
  valor,
  aoMudar,
}: {
  valor: BlocoPergunta[];
  aoMudar: (v: BlocoPergunta[]) => void;
}) {
  const L = LIMITES.pergunta;
  const naInicial = valor.filter((p) => p.inicio).length;
  return (
    <div className="flex flex-col gap-4">
      <p
        className={`text-[14px] ${naInicial < 1 || naInicial > L.inicio ? "font-semibold text-sit-risco-t" : "text-hub-suave"}`}
        role="status"
      >
        {naInicial} na página inicial (de 1 a {L.inicio}).
      </p>
      {valor.map((p, i) => {
        const mudar = (novo: Partial<BlocoPergunta>) =>
          aoMudar(trocar(valor, i, (x) => ({ ...x, ...novo })));
        return (
          <ItemPagina
            key={i}
            titulo={`Pergunta ${i + 1}`}
            nome={`pergunta ${i + 1}`}
            indice={i}
            total={valor.length}
            aoMover={(d) => aoMudar(mover(valor, i, d))}
            aoRemover={() => aoMudar(remover(valor, i))}
          >
            <CampoContador
              rotulo="Pergunta"
              valor={p.pergunta}
              aoMudar={(pergunta) => mudar({ pergunta })}
              limite={L.pergunta}
            />
            <CampoContador
              rotulo="Resposta"
              valor={p.resposta}
              aoMudar={(resposta) => mudar({ resposta })}
              limite={L.resposta}
              linhas={5}
            />
            <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
              <label className="flex flex-col gap-1.5 text-[14px] font-medium">
                Grupo em /perguntas
                <select
                  value={p.grupo}
                  onChange={(e) => mudar({ grupo: e.target.value as GrupoPergunta })}
                  className="h-11 rounded-xl border border-[#DADAD3] bg-white px-3 text-base font-normal"
                >
                  {gruposPerguntas.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.rotulo}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-h-11 items-center gap-2.5 text-[15px]">
                <input
                  type="checkbox"
                  checked={p.inicio}
                  onChange={(e) => mudar({ inicio: e.target.checked })}
                  className="size-5 accent-hub-tinta"
                />
                Mostrar na página inicial
              </label>
            </div>
          </ItemPagina>
        );
      })}
      <BotaoAdicionar
        rotulo="Nova pergunta"
        aoAdicionar={() =>
          aoMudar([...valor, { pergunta: "", resposta: "", grupo: "trabalho", inicio: false }])
        }
        limite={L.itens}
        total={valor.length}
      />
    </div>
  );
}
