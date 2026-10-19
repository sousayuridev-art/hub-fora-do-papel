import { useState } from "react";
import { MoreHorizontal } from "lucide-react";

import { Selo } from "@/components/hub/Selo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dataLocal, moeda } from "@/lib/formatar";
import type { Mensalidade } from "@/lib/financeiro";

const mesAno = (iso: string) =>
  dataLocal(iso).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "");

/** Mensalidades: plano, valor, início e o que está em aberto. */
export function MensalidadesLista({
  itens,
  aoMudar,
}: {
  itens: Mensalidade[];
  aoMudar: (m: Mensalidade, s: Mensalidade["situacao"]) => void;
}) {
  const [encerrando, setEncerrando] = useState<string | null>(null);
  if (itens.length === 0)
    return (
      <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
        Nenhuma mensalidade ainda. Ela nasce sozinha quando um projeto com plano é lançado. Para
        cliente antigo, use "Nova mensalidade".
      </p>
    );
  return (
    <ul className="flex flex-col rounded-2xl border border-hub-borda bg-white">
      {itens.map((m) => (
        <li
          key={m.id}
          className="flex flex-col gap-2 border-b border-hub-borda px-5 py-4 last:border-b-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4"
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-semibold">
              {m.empresa} · {m.plano}
            </span>
            <span className="text-[14px] text-hub-suave">
              Desde {mesAno(m.inicio)} · vence dia {m.dia} · mínimo {m.minimo_meses} meses ·{" "}
              {m.meses_pagos} {m.meses_pagos === 1 ? "mês pago" : "meses pagos"}
              {m.em_aberto_cents > 0 ? ` · ${moeda(m.em_aberto_cents)} em aberto` : ""}
            </span>
          </span>
          <span className="flex items-center gap-3">
            <Selo
              tom={m.situacao === "ativa" ? "ok" : m.situacao === "pausada" ? "atencao" : "neutro"}
            >
              {m.situacao === "ativa"
                ? "Ativa"
                : m.situacao === "pausada"
                  ? "Pausada"
                  : `Encerrada${m.fim ? ` em ${mesAno(m.fim)}` : ""}`}
            </Selo>
            <span className="font-semibold tabular-nums">{moeda(m.valor_cents)}/mês</span>
            {m.situacao !== "encerrada" && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex size-11 items-center justify-center rounded-lg hover:bg-hub-fundo"
                  aria-label={`Ações da mensalidade de ${m.empresa}`}
                >
                  <MoreHorizontal className="size-4" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {m.situacao === "ativa" ? (
                    <DropdownMenuItem className="min-h-11" onSelect={() => aoMudar(m, "pausada")}>
                      Pausar (não gera os próximos meses)
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem className="min-h-11" onSelect={() => aoMudar(m, "ativa")}>
                      Reativar
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="min-h-11 text-sit-risco-t"
                    onSelect={() => setEncerrando(m.id)}
                  >
                    Encerrar (o mês atual continua cobrado)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </span>
          {encerrando === m.id && (
            <div
              role="alert"
              className="flex w-full flex-col gap-3 rounded-xl bg-sit-risco p-4 text-[14.5px] text-sit-risco-t sm:basis-full"
            >
              <p>
                Encerrar a mensalidade de {m.empresa}? O mês atual continua cobrado, os próximos não
                são gerados e o projeto passa para concluído. Não dá para desfazer: para voltar,
                crie uma nova mensalidade.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-[#DADAD3] bg-white px-4 font-medium text-hub-tinta"
                  onClick={() => setEncerrando(null)}
                >
                  Manter
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[#9A1C12] px-4 font-semibold text-white"
                  onClick={() => {
                    aoMudar(m, "encerrada");
                    setEncerrando(null);
                  }}
                >
                  Encerrar mensalidade
                </button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
