import { Copy, Download, ExternalLink } from "lucide-react";

import { IconeMaterial } from "@/components/materiais/IconeMaterial";
import { diaMes } from "@/lib/formatar";
import { abrirArquivo, tamanhoLegivel, tipoLegivel, type Material } from "@/lib/materiais";
import { erro, mensagemDeErro, ok } from "@/lib/notify";

const classeAcao =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-[#DADAD3] bg-white px-3 text-[14.5px] font-medium hover:bg-hub-selecao";

/** Um arquivo, texto ou link no portal, com Ver, Baixar ou Copiar. */
export function ArquivoCartao({ m }: { m: Material }) {
  const abrir = async (baixar: boolean) => {
    try {
      await abrirArquivo(m, baixar);
    } catch (e) {
      erro(mensagemDeErro(e), { tentarDeNovo: () => void abrir(baixar) });
    }
  };
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(m.texto ?? m.url ?? "");
      ok("Copiado.");
    } catch {
      erro("Não foi possível copiar. Selecione o texto e copie à mão.");
    }
  };
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-hub-borda bg-white p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <IconeMaterial m={m} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{m.titulo}</span>
          <span className="truncate text-[13.5px] text-hub-suave">
            {[tipoLegivel(m), tamanhoLegivel(m.tamanho), diaMes(m.atualizado_em)]
              .filter(Boolean)
              .join(" · ")}
          </span>
          {m.descricao && <span className="text-[13.5px] text-hub-suave">{m.descricao}</span>}
        </div>
      </div>
      <div className="flex gap-2 max-sm:[&>*]:flex-1">
        {m.tipo === "arquivo" && (
          <>
            <button type="button" className={classeAcao} onClick={() => void abrir(false)}>
              <ExternalLink className="size-4" aria-hidden="true" /> Ver
            </button>
            <button type="button" className={classeAcao} onClick={() => void abrir(true)}>
              <Download className="size-4" aria-hidden="true" /> Baixar
            </button>
          </>
        )}
        {m.tipo === "link" && m.url && (
          <a href={m.url} target="_blank" rel="noopener noreferrer" className={classeAcao}>
            <ExternalLink className="size-4" aria-hidden="true" /> Abrir
          </a>
        )}
        {m.tipo !== "arquivo" && (
          <button type="button" className={classeAcao} onClick={() => void copiar()}>
            <Copy className="size-4" aria-hidden="true" /> Copiar
          </button>
        )}
      </div>
    </li>
  );
}
