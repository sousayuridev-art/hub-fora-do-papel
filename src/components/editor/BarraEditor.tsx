import {
  ArrowLeft,
  Check,
  Eye,
  Loader2,
  MessageSquarePlus,
  PenLine,
  Redo2,
  Undo2,
} from "lucide-react";
import type { ReactNode } from "react";

import { larguras } from "@/components/editor/larguras";
import type { EstadoRascunho } from "@/components/editor/useRascunho";
import { usePuck } from "@/components/editor/usePuck";
import { cn } from "@/lib/utils";

function BotaoIcone({
  rotulo,
  aoClicar,
  desligado,
  ativo,
  children,
}: {
  rotulo: string;
  aoClicar: () => void;
  desligado?: boolean;
  ativo?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      disabled={desligado}
      aria-label={rotulo}
      title={rotulo}
      className={cn(
        "flex size-11 items-center justify-center rounded-lg text-hub-suave hover:bg-hub-fundo hover:text-hub-tinta disabled:pointer-events-none disabled:opacity-35",
        ativo && "bg-hub-tinta text-white hover:bg-hub-tinta hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

const textoDoEstado = (e: EstadoRascunho, temRascunho: boolean) =>
  e === "salvando" || e === "pendente"
    ? "Salvando…"
    : e === "erro"
      ? "Não salvou · confira a internet"
      : e === "conflito"
        ? "Alterada por outra pessoa"
        : temRascunho
          ? "Rascunho salvo · não publicado"
          : "Tudo publicado";

/** Barra do editor: voltar, página, situação, computador ou celular, desfazer, prévia, pedir ajuste e publicar. */
export function BarraEditor({
  nome,
  estado,
  temRascunho,
  publicando,
  aoVoltar,
  aoPublicar,
  aoPedirAjuste,
}: {
  nome: string;
  estado: EstadoRascunho;
  temRascunho: boolean;
  publicando: boolean;
  aoVoltar: () => void;
  aoPublicar: () => void;
  aoPedirAjuste?: (() => void) | undefined;
}) {
  const dispatch = usePuck((s) => s.dispatch);
  const largura = usePuck((s) => s.appState.ui.viewports.current.width);
  const previa = usePuck((s) => s.appState.ui.previewMode);
  const historico = usePuck((s) => s.history);
  const mudarLargura = (w: number) =>
    dispatch({
      type: "setUi",
      ui: (antes) => ({ viewports: { ...antes.viewports, current: { width: w, height: "auto" } } }),
    });

  return (
    <div className="flex h-16 shrink-0 items-center gap-1 border-b border-hub-borda bg-white px-2 sm:gap-2 sm:px-4">
      <button
        type="button"
        onClick={aoVoltar}
        className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[14.5px] font-medium text-hub-suave hover:bg-hub-fundo hover:text-hub-tinta"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />{" "}
        <span className="max-sm:sr-only">Voltar</span>
      </button>
      <span className="h-6 w-px bg-hub-borda max-sm:hidden" aria-hidden="true" />
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-[15px] font-semibold">{nome}</span>
        <span
          role="status"
          className={cn(
            "flex items-center gap-1 truncate text-[12.5px]",
            estado === "erro" || estado === "conflito" ? "text-sit-risco-t" : "text-hub-suave",
          )}
        >
          {estado === "salvo" && !temRascunho && (
            <Check className="size-3.5 text-[#145A37]" aria-hidden="true" />
          )}
          {textoDoEstado(estado, temRascunho)}
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label="Ver como"
        className="mx-auto hidden rounded-xl bg-hub-fundo p-1 sm:flex"
      >
        {larguras.map(({ largura: w, rotulo, icone: Icone }) => (
          <button
            key={w}
            type="button"
            role="radio"
            aria-checked={largura === w}
            aria-label={rotulo}
            title={rotulo}
            onClick={() => mudarLargura(w)}
            className={cn(
              "flex h-9 w-11 items-center justify-center rounded-lg",
              largura === w
                ? "bg-white text-hub-tinta shadow-sm"
                : "text-hub-suave hover:text-hub-tinta",
            )}
          >
            <Icone className="size-4" aria-hidden="true" />
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-0.5 sm:ml-0">
        <BotaoIcone rotulo="Desfazer" aoClicar={historico.back} desligado={!historico.hasPast}>
          <Undo2 className="size-4" aria-hidden="true" />
        </BotaoIcone>
        <BotaoIcone rotulo="Refazer" aoClicar={historico.forward} desligado={!historico.hasFuture}>
          <Redo2 className="size-4" aria-hidden="true" />
        </BotaoIcone>
        <BotaoIcone
          rotulo={previa === "interactive" ? "Voltar a editar" : "Pré-visualizar"}
          ativo={previa === "interactive"}
          aoClicar={() =>
            dispatch({
              type: "setUi",
              ui: { previewMode: previa === "interactive" ? "edit" : "interactive" },
            })
          }
        >
          {previa === "interactive" ? (
            <PenLine className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </BotaoIcone>
        {aoPedirAjuste && (
          <button
            type="button"
            onClick={aoPedirAjuste}
            className="hidden h-11 items-center gap-1.5 rounded-lg px-3 text-[14px] font-medium text-hub-suave hover:bg-hub-fundo hover:text-hub-tinta md:flex"
          >
            <MessageSquarePlus className="size-4" aria-hidden="true" /> Pedir ajuste nesta página
          </button>
        )}
        <button
          type="button"
          onClick={aoPublicar}
          disabled={publicando || estado === "conflito"}
          className="botao-degrade ml-1 inline-flex h-11 items-center gap-2 rounded-xl px-4 text-[15px] font-semibold text-hub-tinta disabled:opacity-60"
        >
          {publicando && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Publicar
        </button>
      </div>
    </div>
  );
}
