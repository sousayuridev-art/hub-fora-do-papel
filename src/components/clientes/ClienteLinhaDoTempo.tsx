import { Globe, StickyNote } from "lucide-react";

import { rotuloAtividade } from "@/lib/clientes";
import { diaMes, hora, moeda } from "@/lib/formatar";
import { rotuloEtapa, rotuloMotivo, type ItemLinhaDoTempo, type MotivoPerda } from "@/lib/funil";

function descricao(i: ItemLinhaDoTempo): string | null {
  const d = i.detalhe;
  if (i.kind === "etapa_alterada" && i.de && i.para)
    return `${rotuloEtapa[i.de]} → ${rotuloEtapa[i.para]}`;
  if (i.kind === "arquivada" && typeof d["motivo"] === "string")
    return `Motivo: ${rotuloMotivo[d["motivo"] as MotivoPerda]}${d["nota"] ? ` · ${String(d["nota"])}` : ""}`;
  if (i.kind === "pedido_do_site") {
    const partes = [
      d["assunto"],
      d["horario"]
        ? `horário pedido ${diaMes(String(d["horario"]))} ${hora(String(d["horario"]))}`
        : null,
    ];
    return partes.filter(Boolean).join(" · ") || null;
  }
  if (i.kind === "proposta_enviada" && typeof d["total_cents"] === "number")
    return `${moeda(d["total_cents"])} · versão ${String(d["versao"] ?? 1)}`;
  if (i.kind === "proposta_aceita" && typeof d["nome"] === "string")
    return `Aceita por ${d["nome"]}${typeof d["total_cents"] === "number" ? ` · ${moeda(d["total_cents"])}` : ""}`;
  if (i.kind === "proposta_recusada")
    return typeof d["motivo"] === "string" && d["motivo"] ? `Motivo: ${d["motivo"]}` : null;
  if (i.kind === "oportunidade_atualizada" && typeof d["proximo_passo"] === "string")
    return `Próximo passo: ${d["proximo_passo"]}`;
  return null;
}

/** Linha do tempo da ficha: eventos e anotações, do mais recente ao mais antigo. */
export function ClienteLinhaDoTempo({ itens }: { itens: ItemLinhaDoTempo[] }) {
  if (itens.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
        Nada registrado ainda.
      </p>
    );
  }
  return (
    <ol className="flex flex-col rounded-2xl border border-hub-borda bg-white">
      {itens.map((i, n) => {
        const desc = i.tipo === "anotacao" ? i.texto : descricao(i);
        return (
          <li
            key={`${i.quando}-${n}`}
            className="grid grid-cols-[auto_1fr] gap-3 border-b border-hub-borda px-5 py-4 last:border-b-0"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-sit-neutro text-hub-suave"
            >
              {i.tipo === "anotacao" ? (
                <StickyNote className="size-4" />
              ) : i.origem === "site" ? (
                <Globe className="size-4" />
              ) : (
                <span className="size-2 rounded-full bg-current" />
              )}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-[15px] font-medium">
                  {i.tipo === "anotacao" ? "Anotação" : rotuloAtividade(i.kind)}
                  {i.origem === "site" && <span className="text-hub-suave"> · pelo site</span>}
                  {i.origem === "cliente" && (
                    <span className="text-hub-suave"> · pelo cliente</span>
                  )}
                </span>
                <time dateTime={i.quando} className="font-rotulo text-[12.5px] text-hub-suave">
                  {diaMes(i.quando)}, {hora(i.quando)}
                </time>
              </div>
              {desc && <p className="whitespace-pre-line text-[14.5px] text-hub-suave">{desc}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
