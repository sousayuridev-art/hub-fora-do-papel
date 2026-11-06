import { CheckCircle2, FileText, ImageIcon, Mic } from "lucide-react";

import { abrirArquivo, tamanhoLegivel } from "@/lib/materiais";
import { erro, mensagemDeErro } from "@/lib/notify";
import type { PedidoLinha } from "@/lib/pedidos";

const nomeTipo: Record<string, string> = {
  texto: "Trocar texto",
  foto: "Trocar foto",
  tirar: "Tirar",
  mover: "Mudar de lugar",
  incluir: "Incluir algo",
  outro: "Outra coisa",
};

/**
 * Bloco "Onde" do pedido feito pelo painel do cliente (card PC-2): site, página, seção e anexos.
 * Na revisão do site (RS-1) mostra também o tipo, o antes e o depois e o "Ficou bom" do cliente.
 */
export function PedidoOnde({ p }: { p: PedidoLinha }) {
  const c = p.contexto ?? {};
  const linhas: [string, string][] = [];
  if (p.site_nome)
    linhas.push(["Site", p.site_dominio ? `${p.site_nome} · ${p.site_dominio}` : p.site_nome]);
  if (c.pagina) linhas.push(["Página", c.pagina]);
  if (c.secao) linhas.push(["Seção", c.secao]);
  if (p.origin === "revisao") {
    if (p.revisao_numero)
      linhas.push([
        "Revisão",
        `${p.revisao_numero} · ajuste ${p.marcador_ordem ?? "?"} de ${p.revisao_total ?? "?"}`,
      ]);
    if (c.tipo) linhas.push(["Pedido", nomeTipo[c.tipo] ?? c.tipo]);
    if (c.antes) linhas.push(["Hoje está", c.antes]);
    if (c.depois) linhas.push(["Deve ficar", c.depois]);
    if (c.provavel_adicional)
      linhas.push(["Atenção", "Revisão além das incluídas: provável serviço adicional"]);
    if ((p.refeito_vezes ?? 0) > 0)
      linhas.push(["Refeito", `${p.refeito_vezes}x a pedido do cliente`]);
  }
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
        <dl className="grid grid-cols-[92px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[14.5px]">
          {linhas.map(([rotulo, valor]) => (
            <div key={rotulo} className="contents">
              <dt className="text-hub-suave">{rotulo}</dt>
              <dd className="min-w-0 break-words">{valor}</dd>
            </div>
          ))}
        </dl>
      )}
      {p.origin === "revisao" && p.validado_em && (
        <p className="flex items-center gap-2 text-[14px] font-medium text-sit-ok-t">
          <CheckCircle2 className="size-4" aria-hidden="true" /> O cliente conferiu: ficou bom.
        </p>
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
                ) : a.mime?.startsWith("audio/") ? (
                  <Mic className="size-4 shrink-0 text-hub-suave" aria-hidden="true" />
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
