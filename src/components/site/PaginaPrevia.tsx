import { useState } from "react";

import { Abas } from "@/components/hub/Abas";
import { PreviaFrentes } from "@/components/site/PreviaFrentes";
import { PreviaPerguntas } from "@/components/site/PreviaPerguntas";
import { PreviaProjetos } from "@/components/site/PreviaProjetos";
import { PreviaQuemSomos } from "@/components/site/PreviaQuemSomos";
import { PreviaTopo } from "@/components/site/PreviaTopo";
import { useFonteDoSite } from "@/components/site/useFonteDoSite";
import type { Blocos, ChaveBloco } from "@/lib/paginasSite";

type Tela = "celular" | "computador";

/**
 * Prévia da parte da página como fica no site, na largura do celular (360 px) ou do
 * computador. Serve para ver se o texto cabe antes de publicar (card CMS-4).
 */
export function PaginaPrevia<K extends ChaveBloco>({
  chave,
  valor,
}: {
  chave: K;
  valor: Blocos[K];
}) {
  useFonteDoSite();
  const [tela, setTela] = useState<Tela>("celular");
  const celular = tela === "celular";
  const v = valor as Blocos[ChaveBloco];
  return (
    <div className="flex flex-col gap-4">
      <Abas<Tela>
        rotulo="Largura da prévia"
        opcoes={[
          { id: "celular", rotulo: "Celular" },
          { id: "computador", rotulo: "Computador" },
        ]}
        ativa={tela}
        aoEscolher={setTela}
        className="max-md:mx-0 max-md:px-0"
      />
      <div className="overflow-x-auto rounded-2xl border border-[#d6d6cf] bg-[#f5f5f2]">
        <div
          aria-label="Prévia no site"
          role="region"
          className={`mx-auto text-[#0b0e14] ${celular ? "w-[360px] max-w-full" : "min-w-[720px]"}`}
          style={{ fontFamily: '"Geist", ui-sans-serif, system-ui, sans-serif' }}
        >
          {chave === "inicio.topo" ? (
            <PreviaTopo valor={v as Blocos["inicio.topo"]} celular={celular} />
          ) : chave === "inicio.frentes" ? (
            <PreviaFrentes valor={v as Blocos["inicio.frentes"]} celular={celular} />
          ) : chave === "perguntas" ? (
            <PreviaPerguntas valor={v as Blocos["perguntas"]} />
          ) : chave === "projetos" ? (
            <PreviaProjetos valor={v as Blocos["projetos"]} />
          ) : (
            <PreviaQuemSomos valor={v as Blocos["quem-somos"]} celular={celular} />
          )}
        </div>
      </div>
    </div>
  );
}
