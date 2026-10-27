import { Copy } from "lucide-react";

import { copiarEndereco } from "@/components/site/copiarEndereco";
import { tamanhoLegivel } from "@/lib/materiais";
import type { ImagemSite } from "@/lib/site";

/** Miniatura com nome, tamanho e "Copiar endereço". Toque na imagem abre os detalhes. */
export function MidiaItem({ img, aoAbrir }: { img: ImagemSite; aoAbrir: () => void }) {
  return (
    <li className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-hub-borda bg-white">
      <button
        type="button"
        onClick={aoAbrir}
        className="block aspect-[4/3] w-full bg-hub-fundo focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-hub-tinta"
        aria-label={`Ver ${img.nome}`}
      >
        <img
          src={img.url}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      </button>
      <div className="flex min-w-0 flex-col gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium" title={img.nome}>
            {img.nome}
          </p>
          <p className="text-[13px] text-hub-suave">{tamanhoLegivel(img.tamanho) || " "}</p>
        </div>
        <button
          type="button"
          onClick={() => void copiarEndereco(img.url)}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#DADAD3] bg-white px-3 text-[14px] font-medium hover:bg-hub-selecao"
          aria-label={`Copiar endereço de ${img.nome}`}
        >
          <Copy className="size-4 shrink-0" aria-hidden="true" />
          <span className="max-sm:hidden">Copiar endereço</span>
          <span className="sm:hidden">Copiar</span>
        </button>
      </div>
    </li>
  );
}
