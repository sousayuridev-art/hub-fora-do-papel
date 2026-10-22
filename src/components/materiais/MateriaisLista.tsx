import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Copy, Download } from "lucide-react";

import { IconeMaterial } from "@/components/materiais/IconeMaterial";
import { Selo } from "@/components/hub/Selo";
import { diaMes } from "@/lib/formatar";
import {
  abrirArquivo,
  rotuloCategoria,
  tamanhoLegivel,
  tipoLegivel,
  type Material,
} from "@/lib/materiais";
import { erro, mensagemDeErro, ok } from "@/lib/notify";
import { useMargemDaLista } from "@/lib/useMargemDaLista";

/** "Copiar" para textos e links (cards S8 e RD-7). */
async function copiar(m: Material) {
  try {
    await navigator.clipboard.writeText(m.texto ?? m.url ?? "");
    ok(m.tipo === "link" ? "Link copiado." : "Texto copiado.");
  } catch {
    erro("Não foi possível copiar. Abra o material e copie à mão.");
  }
}

/** "Baixar" com o link temporário que o painel já usa. */
async function baixar(m: Material) {
  try {
    await abrirArquivo(m, true);
  } catch (e) {
    erro(mensagemDeErro(e), { tentarDeNovo: () => void baixar(m) });
  }
}

function AcaoRapida({ m }: { m: Material }) {
  if (m.excluido_em) return null;
  const classe =
    "inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#DADAD3] bg-white px-3 text-[14px] font-medium text-hub-tinta transition-colors hover:bg-hub-selecao md:h-10";
  if (m.tipo === "arquivo") {
    return (
      <button
        type="button"
        className={classe}
        onClick={() => void baixar(m)}
        aria-label={`Baixar ${m.titulo}`}
      >
        <Download className="size-4" aria-hidden="true" />
        <span className="max-sm:sr-only">Baixar</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      className={classe}
      onClick={() => void copiar(m)}
      aria-label={m.tipo === "link" ? `Copiar o link de ${m.titulo}` : `Copiar ${m.titulo}`}
    >
      <Copy className="size-4" aria-hidden="true" />
      <span className="max-sm:sr-only">{m.tipo === "link" ? "Copiar link" : "Copiar"}</span>
    </button>
  );
}

/**
 * Lista virtualizada de materiais, rolando com a página (sem rolagem interna).
 * Toque na linha abre o painel; "Copiar"/"Baixar" ficam sempre visíveis na linha.
 */
export function MateriaisLista({
  itens,
  aoAbrir,
}: {
  itens: Material[];
  aoAbrir: (m: Material) => void;
}) {
  const { ref, margem } = useMargemDaLista<HTMLUListElement>();
  const v = useWindowVirtualizer({
    count: itens.length,
    estimateSize: () => 68,
    overscan: 8,
    scrollMargin: margem,
  });
  return (
    <div className="overflow-hidden rounded-2xl border border-hub-borda bg-white">
      <ul ref={ref} className="relative" style={{ height: v.getTotalSize() }}>
        {v.getVirtualItems().map((linha) => {
          const m = itens[linha.index];
          if (!m) return null;
          const detalhe = [tipoLegivel(m), tamanhoLegivel(m.tamanho), m.empresa, m.projeto].filter(
            Boolean,
          );
          return (
            <li
              key={m.id}
              ref={v.measureElement}
              data-index={linha.index}
              className="absolute inset-x-0 top-0 flex items-center gap-2 border-b border-[#F0F0EA] pr-3 md:pr-4"
              style={{ transform: `translateY(${linha.start - v.options.scrollMargin}px)` }}
            >
              <button
                type="button"
                onClick={() => aoAbrir(m)}
                className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left hover:bg-hub-fundo focus-visible:bg-hub-fundo focus-visible:outline-none md:pl-5"
              >
                <IconeMaterial m={m} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[14.5px] font-semibold">{m.titulo}</span>
                  <span className="truncate text-[13px] text-hub-suave">{detalhe.join(" · ")}</span>
                </span>
                <span className="hidden shrink-0 flex-col items-end gap-1 pr-2 sm:flex">
                  {m.origem === "cliente" ? (
                    <Selo tom="info">Do cliente</Selo>
                  ) : m.compartilhado ? (
                    <Selo tom="ok">Compartilhado</Selo>
                  ) : (
                    <span className="text-[13px] text-[#2A2D33]">
                      {rotuloCategoria[m.categoria]}
                    </span>
                  )}
                  <span className="text-[13px] text-hub-suave">{diaMes(m.atualizado_em)}</span>
                </span>
              </button>
              <AcaoRapida m={m} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
