import { ArrowRight } from "lucide-react";

import { TituloPrevia } from "@/components/site/TituloPrevia";
import { CHAMADA_FIXA, type BlocoTopo } from "@/lib/paginasSite";

/** Topo como no site: fundo escuro com brilho azul, título com degradê e chamada fixa. */
export function PreviaTopo({ valor, celular }: { valor: BlocoTopo; celular: boolean }) {
  return (
    <section className="flex flex-col gap-6 bg-[#0b0e14] bg-[radial-gradient(600px_360px_at_80%_30%,rgb(59_91_255/0.42),transparent_60%)] px-5 py-10 text-white sm:px-8">
      <p className="font-mono text-[12.5px] uppercase text-[#c9d4ff]">{valor.linha || "Linha"}</p>
      <h1
        className={`max-w-[640px] break-words leading-[1.05] tracking-[-0.03em] ${celular ? "text-[34px]" : "text-[46px]"}`}
      >
        <TituloPrevia texto={valor.titulo || "Título do topo"} escuro />
      </h1>
      <p className="max-w-[540px] break-words text-[18px] text-[#c9d4ff]">
        {valor.apoio || "Texto de apoio"}
      </p>
      <span className="inline-flex min-h-12 items-center self-start rounded-full bg-[#ffb020] px-6 text-[17px] font-semibold text-[#0b0e14]">
        {CHAMADA_FIXA}
      </span>
      <span className="inline-flex items-center gap-1 break-words text-[15px] text-[#c9d4ff] underline underline-offset-4">
        {valor.link_sites || "Link para sites"}
        <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
      </span>
    </section>
  );
}
