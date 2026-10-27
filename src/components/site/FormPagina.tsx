import { FormFrentes } from "@/components/site/FormFrentes";
import { FormPerguntas } from "@/components/site/FormPerguntas";
import { FormProjetos } from "@/components/site/FormProjetos";
import { FormQuemSomos } from "@/components/site/FormQuemSomos";
import { FormTopo } from "@/components/site/FormTopo";
import type { Blocos, ChaveBloco } from "@/lib/paginasSite";

/** Formulário da chave (card CMS-4): um por parte da página, com campos fixos. */
export function FormPagina<K extends ChaveBloco>({
  chave,
  siteId,
  valor,
  aoMudar,
}: {
  chave: K;
  siteId: string;
  valor: Blocos[K];
  aoMudar: (v: Blocos[K]) => void;
}) {
  const v = valor as Blocos[ChaveBloco];
  const mudar = aoMudar as (v: Blocos[ChaveBloco]) => void;
  switch (chave) {
    case "inicio.topo":
      return <FormTopo valor={v as Blocos["inicio.topo"]} aoMudar={mudar} />;
    case "inicio.frentes":
      return <FormFrentes valor={v as Blocos["inicio.frentes"]} aoMudar={mudar} />;
    case "perguntas":
      return <FormPerguntas valor={v as Blocos["perguntas"]} aoMudar={mudar} />;
    case "projetos":
      return <FormProjetos siteId={siteId} valor={v as Blocos["projetos"]} aoMudar={mudar} />;
    default:
      return <FormQuemSomos valor={v as Blocos["quem-somos"]} aoMudar={mudar} />;
  }
}
