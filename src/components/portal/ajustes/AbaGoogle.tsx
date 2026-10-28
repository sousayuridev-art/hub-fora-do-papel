import { useState } from "react";

import { CampoContador } from "@/components/site/CampoContador";
import { limitesGoogle, type Google } from "@/lib/ajustesSite";

/** Aparecer no Google: título e descrição com contador e a prévia da busca. */
export function AbaGoogle({
  inicial,
  dominio,
  salvando,
  aoSalvar,
}: {
  inicial: Google;
  dominio: string;
  salvando: boolean;
  aoSalvar: (g: Google) => void;
}) {
  const [g, setG] = useState<Google>(inicial);
  const titulo = g.titulo ?? "";
  const descricao = g.descricao ?? "";
  const passou = titulo.length > limitesGoogle.titulo || descricao.length > limitesGoogle.descricao;
  return (
    <div className="grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-5">
        <CampoContador
          rotulo="Título no Google"
          valor={titulo}
          aoMudar={(v) => setG({ ...g, titulo: v })}
          limite={limitesGoogle.titulo}
          ajuda="O nome que aparece em azul na busca. Diga o que você faz e onde."
        />
        <CampoContador
          rotulo="Descrição no Google"
          valor={descricao}
          aoMudar={(v) => setG({ ...g, descricao: v })}
          limite={limitesGoogle.descricao}
          linhas={3}
          ajuda="O texto embaixo do título na busca."
        />
        <p className="text-[13.5px] text-hub-suave">
          O Google atualiza no tempo dele, normalmente em alguns dias. Não é possível garantir
          posição.
        </p>
        <button
          type="button"
          onClick={() => aoSalvar(g)}
          disabled={salvando || passou}
          className="botao-degrade inline-flex h-12 items-center justify-center self-start rounded-xl px-6 text-[15px] font-semibold text-hub-tinta disabled:opacity-60 max-sm:w-full"
        >
          {salvando ? "Salvando…" : "Salvar e publicar"}
        </button>
      </div>
      <section aria-labelledby="previa-google-t" className="flex flex-col gap-2">
        <h3 id="previa-google-t" className="text-[14px] font-medium">
          Como aparece no Google
        </h3>
        <div className="rounded-2xl border border-hub-borda bg-white p-5">
          <p className="truncate text-[13px] text-[#4D5156]">{dominio}</p>
          <p className="mt-1 line-clamp-1 text-[19px] leading-snug text-[#1A0DAB]">
            {titulo || "O título do seu site aparece aqui"}
          </p>
          <p className="mt-1 line-clamp-2 text-[14px] leading-relaxed text-[#4D5156]">
            {descricao || "A descrição aparece aqui, embaixo do título."}
          </p>
        </div>
      </section>
    </div>
  );
}
