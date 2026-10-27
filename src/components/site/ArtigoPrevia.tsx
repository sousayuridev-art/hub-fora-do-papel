import { Fragment } from "react";

import { BlocoPrevia } from "@/components/site/BlocoPrevia";
import { CapaPrevia } from "@/components/site/CapaPrevia";
import { useFonteDoSite } from "@/components/site/useFonteDoSite";
import type { DadosArtigo } from "@/lib/site";

const dataFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const gradienteTitulo =
  "bg-[linear-gradient(92deg,#0b0e14_0%,#1e3a9e_55%,#3b5bff_100%)] bg-clip-text pb-[0.12em] text-transparent";
const gradienteSecao =
  "bg-[linear-gradient(92deg,#1e3a9e_0%,#3b5bff_100%)] bg-clip-text pb-[0.12em] text-transparent";
const etiqueta =
  "inline-block rounded-[4px] border border-[#d6d6cf] px-2.5 py-1 font-mono text-[12px] uppercase leading-normal";

/**
 * Prévia do artigo como fica no site (tema claro dos artigos): topo, capa, sumário e corpo
 * com as regras de article-body.tsx. Mostra também como aparece na busca do Google.
 */
export function ArtigoPrevia({
  dados,
  dominio,
  publicadoEm,
}: {
  dados: DadosArtigo;
  dominio: string;
  publicadoEm: string | null;
}) {
  useFonteDoSite();
  const { corpo } = dados;
  const data = dataFmt.format(publicadoEm ? new Date(publicadoEm) : new Date()).replace(".", "");
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-hub-borda bg-white p-4">
        <p className="mb-2 text-[13px] font-medium text-hub-suave">Na busca do Google</p>
        <p className="break-all text-[13px] text-[#4a4d54]">
          {dominio} › artigos › {dados.slug || "…"}
        </p>
        <p className="text-[18px] leading-snug text-[#1a0dab]">
          {dados.titulo_seo || dados.titulo || "Título para o Google"}
        </p>
        <p className="text-[14px] text-[#4a4d54]">
          {dados.descricao || "Descrição para o Google ainda vazia."}
        </p>
      </div>

      <article
        aria-label="Prévia do artigo"
        className="overflow-hidden rounded-2xl border border-[#d6d6cf] bg-[#f5f5f2] text-[#0b0e14]"
        style={{ fontFamily: '"Geist", ui-sans-serif, system-ui, sans-serif' }}
      >
        <header className="flex flex-col gap-5 border-b border-[#e2e2dc] px-5 pb-8 pt-8 sm:px-8">
          <div className="flex flex-wrap gap-2">
            <span className={`${etiqueta} text-[#2448c9]`}>{dados.categoria || "Categoria"}</span>
            {dados.leitura && (
              <span className={`${etiqueta} text-[#4a4d54]`}>{dados.leitura} de leitura</span>
            )}
          </div>
          <h1
            className={`max-w-[940px] text-[clamp(32px,5vw,52px)] font-semibold leading-[1.04] tracking-[-0.04em] ${gradienteTitulo}`}
          >
            {dados.titulo || "Título do artigo"}
          </h1>
          {dados.resumo && (
            <p className="max-w-[720px] text-[18px] leading-[1.55] text-[#4a4d54] sm:text-[20px]">
              {dados.resumo}
            </p>
          )}
          <div className="flex items-center gap-3.5">
            <span
              aria-hidden="true"
              className="size-12 shrink-0 rounded-full border border-[#d6d6cf] bg-white"
            />
            <div className="min-w-0">
              <p className="text-[17px]">{dados.autor || "Autor"}</p>
              <p className="font-mono text-[12px] text-[#4a4d54]">{data}</p>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-10 px-5 py-8 sm:px-8">
          <CapaPrevia capa={dados.capa} />
          {corpo.secoes.length > 0 && (
            <nav aria-label="Sumário" className="flex flex-col">
              <p className="font-mono text-[12px] text-[#4a4d54]">NESTE ARTIGO</p>
              <div className="mt-4 grid border-t border-[#e2e2dc]">
                {corpo.secoes.map((s, i) => (
                  <span
                    key={s.id}
                    className="grid min-h-11 grid-cols-[8px_minmax(0,1fr)] items-center gap-3 text-[15px] text-[#4a4d54]"
                  >
                    <span
                      aria-hidden="true"
                      className={i === 0 ? "size-2 bg-[#FFB020]" : "size-2 border border-[#2448c9]"}
                    />
                    {s.titulo}
                  </span>
                ))}
              </div>
            </nav>
          )}
          <div className="flex max-w-[720px] flex-col gap-[22px] text-[17px] leading-[1.75] text-[#2a2d33] sm:text-[18px]">
            <div className="rounded-[4px] border border-[#d6d6cf] bg-white p-6 text-[16px]">
              <p className="mb-3 font-mono text-[12px] text-[#7a4200]">RESUMO EM 3 PONTOS</p>
              <ul className="list-disc pl-6 marker:text-[#2448c9]">
                {corpo.pontos.map((p, i) => (
                  <li key={i} className="my-2 pl-0.5">
                    {p || <span className="text-[#9A9DA3]">Ponto {i + 1} vazio</span>}
                  </li>
                ))}
              </ul>
            </div>
            {corpo.secoes.length === 0 && (
              <p className="text-[#4a4d54]">O corpo aparece aqui quando houver uma seção.</p>
            )}
            {corpo.secoes.map((s) => (
              <Fragment key={s.id}>
                <h2
                  className={`mt-7 text-[clamp(24px,3vw,34px)] font-semibold leading-[1.15] tracking-[-0.035em] ${gradienteSecao}`}
                >
                  {s.titulo}
                </h2>
                {s.blocos.map((b, i) => (
                  <BlocoPrevia key={i} bloco={b} dominio={dominio} />
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
