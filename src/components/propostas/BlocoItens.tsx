import { Plus, Star, Trash2 } from "lucide-react";

import { CampoNumero } from "@/components/hub/CampoNumero";
import { BlocoEditor } from "@/components/propostas/BlocoEditor";
import type { PropsBloco } from "@/components/propostas/tipos";
import { classeBotaoSecundario } from "@/lib/estilos";
import type { ItemEntrega } from "@/lib/propostas";
import { cn } from "@/lib/utils";

/** Itens de entrega: o cliente vê nome e descrição; as horas ficam só no Hub. */
export function BlocoItens({ d, alterar, bloqueado, horas }: PropsBloco & { horas: number }) {
  const mudarItem = (i: number, campos: Partial<ItemEntrega>) =>
    alterar({ itens: d.itens.map((it, j) => (j === i ? { ...it, ...campos } : it)) });
  const campo =
    "w-full rounded-lg border border-transparent bg-transparent px-2 outline-none hover:border-[#DADAD3] focus:border-hub-tinta disabled:hover:border-transparent";

  return (
    <BlocoEditor
      id="itens"
      titulo="Itens de entrega"
      texto="Horas estimadas por item. O cliente vê os itens; as horas ficam só aqui. A estrela marca o coração do projeto."
    >
      {d.itens.length === 0 && (
        <p className="rounded-xl border border-dashed border-[#D6D6CF] p-4 text-[14.5px] text-hub-suave">
          Nenhum item ainda. Comece pelo que resolve o problema principal do cliente.
        </p>
      )}
      <ol className="flex flex-col">
        {d.itens.map((it, i) => (
          <li
            key={i}
            className="grid grid-cols-[28px_1fr_auto] items-start gap-2 border-b border-hub-borda py-3 last:border-b-0 sm:grid-cols-[28px_1fr_120px_auto]"
          >
            <span className="pt-2.5 text-[13px] font-semibold text-hub-suave tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="flex min-w-0 flex-col">
              <label className="sr-only" htmlFor={`item-${i}`}>
                Nome do item {i + 1}
              </label>
              <input
                id={`item-${i}`}
                value={it.nome}
                maxLength={120}
                disabled={bloqueado}
                placeholder="Nome do item"
                onChange={(e) => mudarItem(i, { nome: e.target.value })}
                className={cn(campo, "h-10 text-base font-medium md:text-[15px]")}
              />
              <label className="sr-only" htmlFor={`desc-${i}`}>
                Descrição do item {i + 1}
              </label>
              <input
                id={`desc-${i}`}
                value={it.descricao}
                maxLength={400}
                disabled={bloqueado}
                placeholder="O que o cliente ganha com isso (opcional)"
                onChange={(e) => mudarItem(i, { descricao: e.target.value })}
                className={cn(campo, "h-9 text-[14px] text-hub-suave")}
              />
            </div>
            <div className="col-start-2 row-start-2 max-w-[140px] sm:col-start-3 sm:row-start-1">
              <CampoNumero
                bloqueado={bloqueado}
                rotulo={`Horas do item ${i + 1}`}
                rotuloOculto
                sufixo="h"
                valor={it.horas}
                aoMudar={(n) => mudarItem(i, { horas: n ?? 0 })}
              />
            </div>
            {!bloqueado && (
              <div className="col-start-3 row-span-2 flex flex-col sm:col-start-4 sm:row-span-1 sm:flex-row">
                <button
                  type="button"
                  aria-pressed={it.destaque}
                  aria-label={it.destaque ? "Tirar o destaque" : "Marcar como o coração do projeto"}
                  title="Coração do projeto"
                  onClick={() => mudarItem(i, { destaque: !it.destaque })}
                  className={cn(
                    "flex size-11 items-center justify-center rounded-lg hover:bg-hub-fundo",
                    it.destaque ? "text-[#B86E00]" : "text-hub-suave",
                  )}
                >
                  <Star
                    className={cn("size-4", it.destaque && "fill-current")}
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  aria-label={`Remover ${it.nome || `item ${i + 1}`}`}
                  onClick={() => alterar({ itens: d.itens.filter((_, j) => j !== i) })}
                  className="flex size-11 items-center justify-center rounded-lg text-hub-suave hover:bg-sit-risco hover:text-sit-risco-t"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!bloqueado && (
          <button
            type="button"
            className={classeBotaoSecundario}
            disabled={d.itens.length >= 40}
            onClick={() =>
              alterar({
                itens: [...d.itens, { nome: "", descricao: "", horas: 0, destaque: false }],
              })
            }
          >
            <Plus className="size-4" aria-hidden="true" />
            Adicionar item
          </button>
        )}
        <p className="ml-auto text-[14.5px]">
          Total: <strong className="tabular-nums">{horas.toLocaleString("pt-BR")} h</strong>{" "}
          estimadas
        </p>
      </div>
    </BlocoEditor>
  );
}
