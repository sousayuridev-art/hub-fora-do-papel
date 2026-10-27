import { BotaoAdicionar } from "@/components/site/BotaoAdicionar";
import { CampoContador } from "@/components/site/CampoContador";
import { EscolherImagem } from "@/components/site/EscolherImagem";
import { ItemPagina } from "@/components/site/ItemPagina";
import { mover, remover, trocar } from "@/lib/editorArtigo";
import { LIMITES, type BlocoProjeto } from "@/lib/paginasSite";

/**
 * Projetos reais (card CMS-4): aparecem na linha "Projetos reais" do topo e na abertura
 * das demonstrações. Imagem e link são opcionais.
 */
export function FormProjetos({
  siteId,
  valor,
  aoMudar,
}: {
  siteId: string;
  valor: BlocoProjeto[];
  aoMudar: (v: BlocoProjeto[]) => void;
}) {
  const L = LIMITES.projeto;
  return (
    <div className="flex flex-col gap-4">
      {valor.map((p, i) => {
        const mudar = (novo: Partial<BlocoProjeto>) =>
          aoMudar(trocar(valor, i, (x) => ({ ...x, ...novo })));
        return (
          <ItemPagina
            key={i}
            titulo={p.nome.trim() || `Projeto ${i + 1}`}
            nome={`projeto ${i + 1}`}
            indice={i}
            total={valor.length}
            aoMover={(d) => aoMudar(mover(valor, i, d))}
            aoRemover={() => aoMudar(remover(valor, i))}
          >
            <CampoContador
              rotulo="Nome"
              valor={p.nome}
              aoMudar={(nome) => mudar({ nome })}
              limite={L.nome}
            />
            <CampoContador
              rotulo="Linha (o que foi feito)"
              valor={p.linha}
              aoMudar={(linha) => mudar({ linha })}
              limite={L.linha}
              linhas={2}
              placeholder="sistema de vendas e atendimento"
            />
            <EscolherImagem
              siteId={siteId}
              rotulo="Imagem (opcional)"
              valor={p.imagem}
              aoMudar={(imagem) => mudar({ imagem })}
            />
            <CampoContador
              rotulo="Link (opcional)"
              valor={p.link ?? ""}
              aoMudar={(link) => mudar({ link })}
              limite={L.link}
              placeholder="https://… ou /caminho-no-site"
              ajuda="Endereço que começa com https:// ou um caminho do próprio site, como /artigos."
            />
          </ItemPagina>
        );
      })}
      <BotaoAdicionar
        rotulo="Novo projeto"
        aoAdicionar={() => aoMudar([...valor, { nome: "", linha: "", imagem: null, link: null }])}
        limite={L.itens}
        total={valor.length}
      />
    </div>
  );
}
