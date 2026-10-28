import { FileText, ImageIcon } from "lucide-react";

import { abrirArquivo, tamanhoLegivel } from "@/lib/materiais";
import { erro, mensagemDeErro } from "@/lib/notify";
import type { PedidoLinha } from "@/lib/pedidos";

/** Bloco "Onde" do pedido feito pelo painel do cliente (card PC-2): site, página, seção e anexos. */
export function PedidoOnde({ p }: { p: PedidoLinha }) {
  const c = p.contexto ?? {};
  const linhas: [string, string][] = [];
  if (p.site_nome)
    linhas.push(["Site", p.site_dominio ? `${p.site_nome} · ${p.site_dominio}` : p.site_nome]);
  if (c.pagina) linhas.push(["Página", c.pagina]);
  if (c.secao) linhas.push(["Seção", c.secao]);
  const anexos = p.anexos ?? [];
  if (linhas.length === 0 && anexos.length === 0) return null;

  return (
    <section
      aria-labelledby={`onde-${p.id}`}
      className="flex flex-col gap-3 rounded-xl bg-hub-fundo p-4"
    >
      <h3 id={`onde-${p.id}`} className="text-[14px] font-semibold">
        Onde
      </h3>
      {linhas.length > 0 && (
        <dl className="grid grid-cols-[80px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[14.5px]">
          {linhas.map(([rotulo, valor]) => (
            <div key={rotulo} className="contents">
              <dt className="text-hub-suave">{rotulo}</dt>
              <dd className="min-w-0 break-words">{valor}</dd>
            </div>
          ))}
        </dl>
      )}
      {anexos.length > 0 && (
        <ul className="flex flex-col gap-2">
          {anexos.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-hub-borda bg-white px-3 text-left hover:border-hub-tinta"
                onClick={() =>
                  void abrirArquivo(a, false).catch((e: unknown) => erro(mensagemDeErro(e)))
                }
              >
                {a.mime === "application/pdf" ? (
                  <FileText className="size-4 shrink-0 text-hub-suave" aria-hidden="true" />
                ) : (
                  <ImageIcon className="size-4 shrink-0 text-hub-suave" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{a.arquivo}</span>
                <span className="text-[13px] text-hub-suave tabular-nums">
                  {tamanhoLegivel(a.tamanho)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
