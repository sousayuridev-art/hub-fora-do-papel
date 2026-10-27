import { BotaoAdicionar } from "@/components/site/BotaoAdicionar";
import { BotoesMover } from "@/components/site/BotoesMover";
import { CampoContador } from "@/components/site/CampoContador";
import { ItemPagina } from "@/components/site/ItemPagina";
import { mover, remover, trocar } from "@/lib/editorArtigo";
import { frentesFixas, LIMITES, type BlocoFrente } from "@/lib/paginasSite";

/**
 * As 4 frentes (card CMS-4). Ordem, número, ícone, destino de "Quero algo assim" e o
 * assunto do formulário são fixos; aqui mudam só os textos.
 */
export function FormFrentes({
  valor,
  aoMudar,
}: {
  valor: BlocoFrente[];
  aoMudar: (v: BlocoFrente[]) => void;
}) {
  const L = LIMITES.frente;
  return (
    <div className="flex flex-col gap-4">
      {frentesFixas.map((fixa) => {
        const i = valor.findIndex((f) => f.id === fixa.id);
        const f = valor[i];
        if (!f) return null;
        const mudar = (novo: Partial<BlocoFrente>) =>
          aoMudar(trocar(valor, i, (x) => ({ ...x, ...novo })));
        return (
          <ItemPagina key={fixa.id} titulo={fixa.rotulo} nome={fixa.rotulo} indice={i} total={4}>
            <CampoContador
              rotulo="Situação (quem visita, em primeira pessoa)"
              valor={f.situacao}
              aoMudar={(situacao) => mudar({ situacao })}
              limite={L.situacao}
              linhas={2}
            />
            <CampoContador
              rotulo="Título"
              valor={f.titulo}
              aoMudar={(titulo) => mudar({ titulo })}
              limite={L.titulo}
            />
            <CampoContador
              rotulo="Frase"
              valor={f.frase}
              aoMudar={(frase) => mudar({ frase })}
              limite={L.frase}
              linhas={3}
            />
            <div className="flex flex-col gap-3">
              <p className="text-[14px] font-medium">Tópicos</p>
              {f.topicos.map((t, j) => (
                <div key={j} className="flex min-w-0 items-end gap-1">
                  <CampoContador
                    rotulo={`Tópico ${j + 1}`}
                    valor={t}
                    aoMudar={(v) => mudar({ topicos: trocar(f.topicos, j, () => v) })}
                    limite={L.topico}
                    className="flex-1"
                  />
                  <BotoesMover
                    nome={`tópico ${j + 1} de ${fixa.rotulo}`}
                    indice={j}
                    total={f.topicos.length}
                    aoMover={(d) => mudar({ topicos: mover(f.topicos, j, d) })}
                    aoRemover={() => mudar({ topicos: remover(f.topicos, j) })}
                  />
                </div>
              ))}
              <BotaoAdicionar
                rotulo="Adicionar tópico"
                aoAdicionar={() => mudar({ topicos: [...f.topicos, ""] })}
                limite={L.topicos}
                total={f.topicos.length}
              />
            </div>
          </ItemPagina>
        );
      })}
    </div>
  );
}
