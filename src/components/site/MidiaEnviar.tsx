import { useRef } from "react";
import { Loader2, Upload } from "lucide-react";

import { useMutacoesMidia } from "@/components/site/useMutacoesMidia";
import { classeAcaoPrincipal } from "@/lib/estilos";
import { erro } from "@/lib/notify";
import { problemaDaImagem, tiposImagem } from "@/lib/site";

/** Ação principal da aba Mídia: escolhe imagens (JPG, PNG ou WebP até 2 MB) e envia uma a uma. */
export function MidiaEnviar({ siteId }: { siteId: string }) {
  const seletor = useRef<HTMLInputElement>(null);
  const { enviar } = useMutacoesMidia(siteId);

  async function escolher(lista: FileList | null) {
    const arquivos = [...(lista ?? [])];
    if (seletor.current) seletor.current.value = "";
    for (const f of arquivos) {
      const problema = problemaDaImagem(f);
      if (problema) {
        erro(problema);
        continue;
      }
      try {
        await enviar.mutateAsync(f);
      } catch {
        return; // o aviso já saiu; para no primeiro que falhar
      }
    }
  }

  return (
    <>
      <input
        ref={seletor}
        type="file"
        multiple
        accept={`${tiposImagem.join(",")},.jpg,.jpeg,.png,.webp`}
        className="sr-only"
        aria-label="Escolher imagens"
        tabIndex={-1}
        onChange={(e) => void escolher(e.target.files)}
      />
      <button
        type="button"
        className={classeAcaoPrincipal}
        disabled={enviar.isPending}
        onClick={() => seletor.current?.click()}
      >
        {enviar.isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Upload className="size-4" aria-hidden="true" />
        )}
        {enviar.isPending ? "Enviando…" : "Enviar imagem"}
      </button>
    </>
  );
}
