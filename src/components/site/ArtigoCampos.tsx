import { CampoEscolha, CampoTexto } from "@/components/hub/Campo";
import { ArtigoEndereco } from "@/components/site/ArtigoEndereco";
import { CampoContador } from "@/components/site/CampoContador";
import { EscolherImagem } from "@/components/site/EscolherImagem";
import { useGaleria } from "@/components/site/galeria";
import { limites, mudarTitulo, type FormArtigo } from "@/lib/editorArtigo";
import { capas, type CapaArtigo } from "@/lib/site";

/** Dados do artigo: título, categoria, endereço, resumo, leitura, autor e capa. */
export function ArtigoCampos({
  form,
  aoMudar,
  categorias,
  dominio,
  slugTravado,
  siteId,
}: {
  form: FormArtigo;
  aoMudar: (f: FormArtigo) => void;
  categorias: string[];
  dominio: string;
  slugTravado: boolean;
  siteId: string;
}) {
  const galeria = useGaleria();
  const opcoesCategoria = [...new Set([...categorias, form.categoria].filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((c) => ({ id: c, rotulo: c }));
  return (
    <div className="flex flex-col gap-4">
      <CampoContador
        rotulo="Título"
        valor={form.titulo}
        aoMudar={(v) => aoMudar(mudarTitulo(form, v, slugTravado))}
        limite={limites.titulo}
      />
      <ArtigoEndereco
        valor={form.slug}
        aoMudar={(v) => aoMudar({ ...form, slug: v, slugManual: true })}
        dominio={dominio}
        travado={slugTravado}
      />
      <CampoEscolha
        rotulo="Categoria"
        valor={form.categoria}
        aoMudar={(v) => aoMudar({ ...form, categoria: v })}
        opcoes={opcoesCategoria}
        vazio="Escolha a categoria"
      />
      <CampoContador
        rotulo="Resumo"
        valor={form.resumo}
        aoMudar={(v) => aoMudar({ ...form, resumo: v })}
        limite={limites.resumo}
        linhas={3}
        ajuda="Linha fina abaixo do título e texto do cartão na lista de artigos."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto
          rotulo="Tempo de leitura"
          valor={form.leitura}
          aoMudar={(v) => aoMudar({ ...form, leitura: v })}
          placeholder="Ex.: 5 min"
          maxLength={limites.leitura}
          autoComplete="off"
        />
        <CampoTexto
          rotulo="Autor"
          valor={form.autor}
          aoMudar={(v) => aoMudar({ ...form, autor: v })}
          maxLength={limites.autor}
          autoComplete="name"
        />
      </div>
      <CampoEscolha<CapaArtigo | "imagem">
        rotulo="Capa"
        valor={form.capa}
        aoMudar={(v) => aoMudar({ ...form, capa: v })}
        opcoes={[...capas, { id: "imagem", rotulo: `Foto enviada (${galeria.nome})` }]}
      />
      {form.capa === "imagem" && (
        <EscolherImagem
          siteId={siteId}
          rotulo="Foto da capa"
          valor={form.capaUrl || null}
          aoMudar={(url) => aoMudar({ ...form, capaUrl: url ?? "" })}
        />
      )}
    </div>
  );
}
