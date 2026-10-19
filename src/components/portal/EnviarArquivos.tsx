import { useRef } from "react";
import { Upload } from "lucide-react";

import { problemaDoArquivo, tiposAceitos } from "@/lib/materiais";
import { erro } from "@/lib/notify";
import { cn } from "@/lib/utils";

/** Botão que abre o seletor de arquivos (fotos, PDF, Office…) e confere tipo e tamanho antes. */
export function EnviarArquivos({
  rotulo,
  enviando,
  principal = false,
  aoEscolher,
}: {
  rotulo: string;
  enviando: boolean;
  principal?: boolean;
  aoEscolher: (arquivos: File[]) => void;
}) {
  const seletor = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={seletor}
        type="file"
        multiple
        accept={tiposAceitos.join(",") + ",.heic,.heif"}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const fs = Array.from(e.target.files ?? []).slice(0, 20);
          e.target.value = "";
          const problema = fs.map(problemaDoArquivo).find(Boolean);
          if (problema) {
            erro(problema);
            return;
          }
          if (fs.length) aoEscolher(fs);
        }}
      />
      <button
        type="button"
        disabled={enviando}
        onClick={() => seletor.current?.click()}
        className={cn(
          "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold disabled:opacity-60 sm:w-auto",
          principal
            ? "bg-[#FFB020] text-hub-tinta hover:bg-[#F5A50F]"
            : "border border-[#DADAD3] bg-white hover:bg-hub-selecao",
        )}
      >
        <Upload className="size-4" aria-hidden="true" />
        {enviando ? "Enviando…" : rotulo}
      </button>
    </>
  );
}
