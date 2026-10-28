import { useRef } from "react";
import { Loader2, Upload } from "lucide-react";

import { useMutacoesFotos } from "@/components/portal/site/useMutacoesFotos";
import { problemaDaFoto, tiposFotoEntrada } from "@/lib/fotosSite";
import { erro } from "@/lib/notify";

/** Botão principal de Fotos e arquivos: escolhe fotos, reduz no aparelho e envia uma a uma. */
export function EnviarFotos({ siteId }: { siteId: string }) {
  const seletor = useRef<HTMLInputElement>(null);
  const { enviar } = useMutacoesFotos(siteId);

  async function escolher(lista: FileList | null) {
    const fotos = [...(lista ?? [])];
    if (seletor.current) seletor.current.value = "";
    for (const f of fotos) {
      const problema = problemaDaFoto(f);
      if (problema) {
        erro(problema);
        continue;
      }
      try {
        await enviar.mutateAsync(f);
      } catch {
        return; // o aviso com "Tentar de novo" já saiu; para no primeiro que falhar
      }
    }
  }

  return (
    <>
      <input
        ref={seletor}
        type="file"
        multiple
        accept={`${tiposFotoEntrada.join(",")},.jpg,.jpeg,.png,.webp`}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => void escolher(e.target.files)}
      />
      <button
        type="button"
        disabled={enviar.isPending}
        onClick={() => seletor.current?.click()}
        className="botao-degrade inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold text-hub-tinta disabled:opacity-70 max-md:w-full"
      >
        {enviar.isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Upload className="size-4" aria-hidden="true" />
        )}
        {enviar.isPending ? "Enviando…" : "Enviar fotos"}
      </button>
    </>
  );
}
