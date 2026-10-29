import { Copy, Users } from "lucide-react";

import { classeAcaoTexto } from "@/lib/estilos";
import { erro, ok } from "@/lib/notify";
import type { Versao } from "@/lib/marketing";

/**
 * Link com rastreio da versão (MK-4): quem chega ao site por ele e manda o formulário entra no
 * funil já com esta peça como origem. Depois de publicada, mostra quantos contatos vieram.
 */
export function LinkRastreio({ v }: { v: Versao }) {
  if (!v.codigo) return null;
  const copiar = async () => {
    if (!v.link) return;
    try {
      await navigator.clipboard.writeText(v.link);
      ok("Link copiado.");
    } catch {
      erro("Não deu para copiar. Selecione o link e copie à mão.");
    }
  };
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-hub-borda bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[14px] font-medium">
          Link com rastreio <span className="font-normal text-hub-suave">· código {v.codigo}</span>
        </span>
        {v.link && (
          <button
            type="button"
            onClick={() => void copiar()}
            className={`${classeAcaoTexto} gap-2`}
          >
            <Copy className="size-4" aria-hidden="true" /> Copiar
          </button>
        )}
      </div>
      {v.link ? (
        <>
          <code className="break-all rounded-lg bg-hub-fundo px-2 py-1.5 text-[12.5px]">
            {v.link}
          </code>
          <p className="text-[13px] text-hub-suave">
            Use na bio, no adesivo de link dos Stories ou no post do LinkedIn. Quem enviar o
            formulário do site chega no funil com esta peça como origem.
          </p>
        </>
      ) : (
        <p className="text-[13px] text-hub-suave">
          Cadastre o site da agência em Sites para gerar o link.
        </p>
      )}
      {v.published_at && (
        <p className="flex items-center gap-2 text-[14px] tabular-nums">
          <Users className="size-4 text-hub-suave" aria-hidden="true" />
          Contatos desta versão:{" "}
          <b className="font-semibold">{(v.contatos ?? 0).toLocaleString("pt-BR")}</b>
        </p>
      )}
    </div>
  );
}
