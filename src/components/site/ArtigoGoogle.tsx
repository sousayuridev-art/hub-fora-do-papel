import { CampoContador } from "@/components/site/CampoContador";
import { limites, type FormArtigo } from "@/lib/editorArtigo";

/** Como o artigo aparece no Google: título (até 60) e descrição (até 155). */
export function ArtigoGoogle({
  form,
  aoMudar,
}: {
  form: FormArtigo;
  aoMudar: (f: FormArtigo) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <CampoContador
        rotulo="Título para o Google"
        valor={form.titulo_seo}
        aoMudar={(v) => aoMudar({ ...form, titulo_seo: v })}
        limite={limites.titulo_seo}
        ajuda="Aparece na aba do navegador e na busca. Acima de 60 caracteres o Google corta."
      />
      <CampoContador
        rotulo="Descrição para o Google"
        valor={form.descricao}
        aoMudar={(v) => aoMudar({ ...form, descricao: v })}
        limite={limites.descricao}
        linhas={3}
        ajuda="O texto embaixo do título na busca."
      />
    </div>
  );
}
