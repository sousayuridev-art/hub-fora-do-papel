import { useRef, useState } from "react";
import { ImageUp, Loader2 } from "lucide-react";

import { enviarFoto, mensagemDaFoto, problemaDaFoto } from "@/lib/fotosSite";
import { erro, mensagemDeErro } from "@/lib/notify";
import { cn } from "@/lib/utils";

/**
 * Envio de foto do catálogo (HUB-CG-02/03): usa o envio das fotos do site (compressão no
 * navegador, WebP, bucket site-midia) com o lado maior limitado ao tamanho de cada lugar.
 */
export function EnviarFotoBotao({
  siteId,
  maiorLado,
  rotulo,
  aoEnviar,
  className,
  desligado = false,
}: {
  siteId: string;
  maiorLado: number;
  rotulo: string;
  aoEnviar: (caminho: string) => void;
  className?: string;
  desligado?: boolean;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const enviar = async (f: File) => {
    const problema = problemaDaFoto(f);
    if (problema) {
      erro(problema);
      return;
    }
    setEnviando(true);
    try {
      const foto = await enviarFoto(siteId, f, maiorLado);
      aoEnviar(foto.caminho);
    } catch (e) {
      erro(mensagemDaFoto(e) ?? `Não foi possível enviar a foto. ${mensagemDeErro(e)}`, {
        tentarDeNovo: () => void enviar(f),
      });
    } finally {
      setEnviando(false);
    }
  };
  return (
    <>
      <input
        ref={entrada}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void enviar(f);
        }}
      />
      <button
        type="button"
        disabled={enviando || desligado}
        onClick={() => entrada.current?.click()}
        className={cn(
          "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-[#C9D0DA] bg-white px-3 text-[14px] font-medium text-hub-tinta hover:bg-[#F5F7FA] disabled:opacity-50 md:min-h-10",
          className,
        )}
      >
        {enviando ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <ImageUp className="size-4" aria-hidden="true" />
        )}
        {enviando ? "Enviando…" : rotulo}
      </button>
    </>
  );
}
