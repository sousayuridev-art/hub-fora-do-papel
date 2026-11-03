import { AppWindow } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Capa do sistema (SIS-1): o print da tela principal. Sem print, uma moldura escura com o nome e o
 * endereço, no mesmo tamanho, para a lista não ficar desalinhada.
 */
export function CapaDoSistema({
  url,
  nome,
  endereco,
  altura = 150,
  className,
}: {
  url: string | undefined;
  nome: string;
  endereco: string | null;
  altura?: number;
  className?: string;
}) {
  if (url)
    return (
      <div
        aria-hidden="true"
        className={cn("overflow-hidden border-b border-[#EEF1F5] bg-[#F5F7FA]", className)}
        style={{ height: altura }}
      >
        <img src={url} alt="" loading="lazy" className="h-full w-full object-cover object-top" />
      </div>
    );
  const host = endereco ? endereco.replace(/^https:\/\//, "").replace(/\/.*$/, "") : null;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "capa-escura flex flex-col justify-end gap-1 overflow-hidden border-b border-[#EEF1F5] px-4 pb-3 text-white",
        className,
      )}
      style={{ height: altura }}
    >
      <AppWindow className="size-5 text-[#FFB020]" />
      <span className="truncate text-[15px] font-semibold">{nome}</span>
      <span className="truncate text-[12.5px] text-white/60">
        {host ?? "Envie um print da tela principal"}
      </span>
    </div>
  );
}
