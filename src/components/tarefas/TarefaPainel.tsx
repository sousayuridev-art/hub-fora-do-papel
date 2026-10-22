import { useEffect, useId, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, RotateCcw } from "lucide-react";

import { PainelLateral } from "@/components/hub/PainelLateral";
import { Segmentos } from "@/components/tarefas/Segmentos";
import { useMutacoesTarefa } from "@/components/tarefas/useMutacoesTarefa";
import { classeAcaoPrincipal, classeBotaoSecundario } from "@/lib/estilos";
import { diaMes, hora, isoDoDia } from "@/lib/formatar";
import type { PrioridadeTarefa, SituacaoTarefa } from "@/lib/projetos";
import {
  avisoDoPrazo,
  rotuloPrioridade,
  rotuloSituacao,
  type CamposTarefa,
  type TarefaVista,
} from "@/lib/tarefas";
import { cn } from "@/lib/utils";

const classeCampo =
  "w-full min-w-0 rounded-xl border border-[#DADAD3] bg-white px-3 text-base text-hub-tinta outline-none placeholder:text-[#9A9DA3] focus:border-hub-tinta focus:ring-2 focus:ring-hub-tinta/10 md:text-[15px]";

const situacoes: SituacaoTarefa[] = ["a_fazer", "fazendo", "para_aprovar", "pronto"];
const prioridades: PrioridadeTarefa[] = ["alta", "normal", "baixa"];

function quando(iso: string, hoje: string): string {
  const dia = isoDoDia(new Date(iso)) === hoje ? "hoje" : diaMes(iso);
  return `${dia}, ${hora(iso)}`;
}

/**
 * Painel da tarefa (TA-2), o mesmo na Central e no projeto. Salva sozinho a cada mudança
 * (otimista, desfaz se o banco recusar). Sheet à direita; painel de baixo no celular.
 */
export function TarefaPainel({
  tarefa,
  hoje,
  aoFechar,
  noProjeto = false,
}: {
  tarefa: TarefaVista | null;
  hoje: string;
  aoFechar: () => void;
  /** Já está na página do projeto: "Abrir projeto" só troca o ciclo. */
  noProjeto?: boolean;
}) {
  const m = useMutacoesTarefa();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [area, setArea] = useState("");
  const [card, setCard] = useState("");
  const idTitulo = useId();
  const idDesc = useId();
  const idPrazo = useId();
  const idArea = useId();
  const idCard = useId();

  // Recarrega os campos ao abrir outra tarefa (não a cada eco do banco, para não apagar o que se digita).
  const id = tarefa?.id;
  useEffect(() => {
    if (!tarefa) return;
    setTitulo(tarefa.title);
    setDescricao(tarefa.description ?? "");
    setArea(tarefa.area ?? "");
    setCard(tarefa.card_ref ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Mantém a última tarefa enquanto o painel fecha (a animação não mostra o painel vazio).
  const ultima = useRef<TarefaVista | null>(null);
  if (tarefa) ultima.current = tarefa;
  const t = tarefa ?? ultima.current;
  const salvar = (campos: CamposTarefa) => {
    if (t && !t.id.startsWith("temp-")) m.editar.mutate({ id: t.id, campos });
  };
  const mover = (s: SituacaoTarefa) => {
    if (t && !t.id.startsWith("temp-")) m.mover.mutate({ id: t.id, situacao: s });
  };

  const aviso = t ? avisoDoPrazo(t, hoje) : null;
  const tipoTexto = t
    ? t.kind === "cliente"
      ? "Tarefa de cliente"
      : t.kind === "hub"
        ? "Tarefa do Hub"
        : "Tarefa interna"
    : "Tarefa";

  return (
    <PainelLateral
      aberto={tarefa !== null}
      aoMudar={(v) => !v && aoFechar()}
      titulo={tipoTexto}
      descricao={t ? `Criada em ${diaMes(t.created_at)} · salva sozinha a cada mudança` : undefined}
      rodape={
        t && (
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => {
                m.remover(t);
                aoFechar();
              }}
              className="inline-flex min-h-11 items-center justify-center px-2 text-[14.5px] font-medium text-sit-risco-t underline-offset-2 hover:underline"
            >
              Remover
            </button>
            {t.status === "pronto" ? (
              <button
                type="button"
                className={classeBotaoSecundario}
                onClick={() => mover("a_fazer")}
              >
                <RotateCcw className="size-4" aria-hidden="true" /> Reabrir tarefa
              </button>
            ) : (
              <button type="button" className={classeAcaoPrincipal} onClick={() => mover("pronto")}>
                <Check className="size-4" aria-hidden="true" /> Marcar como pronta
              </button>
            )}
          </div>
        )
      }
    >
      {t && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <label htmlFor={idTitulo} className="sr-only">
              Título da tarefa
            </label>
            <textarea
              id={idTitulo}
              rows={2}
              value={titulo}
              maxLength={120}
              onChange={(e) => setTitulo(e.target.value.replace(/\n/g, " "))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              onBlur={() => {
                const novo = titulo.trim();
                if (novo.length < 2) setTitulo(t.title);
                else if (novo !== t.title) salvar({ titulo: novo });
              }}
              className="-mx-2 resize-none rounded-lg border border-transparent px-2 py-1 font-titulo text-[20px] font-bold leading-snug text-hub-tinta outline-none hover:border-hub-borda focus:border-hub-tinta"
            />
          </div>

          {t.projeto ? (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-coluna p-3.5">
              <span className="flex min-w-0 flex-col">
                <b className="truncate text-[14.5px] font-semibold">{t.projeto.nome}</b>
                <span className="truncate text-[13px] text-hub-suave">
                  {[t.cliente?.empresa, `ciclo ${t.cycle}`].filter(Boolean).join(" · ")}
                </span>
              </span>
              {!noProjeto && (
                <Link
                  to="/app/projetos/$id"
                  params={{ id: t.projeto.id }}
                  search={{ tarefa: t.id }}
                  className="inline-flex min-h-11 shrink-0 items-center px-1 text-[14px] font-medium text-[#1E3FA8] underline underline-offset-2"
                >
                  Abrir projeto
                </Link>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="text-[14px] font-medium">Tipo</span>
              <Segmentos
                rotulo="Tipo da tarefa"
                valor={t.kind === "hub" ? "hub" : "interna"}
                opcoes={[
                  { id: "interna", rotulo: "Interna" },
                  { id: "hub", rotulo: "Hub" },
                ]}
                aoEscolher={(v) => salvar({ tipo: v })}
              />
              <span className="text-[13px] text-hub-suave">
                Sem projeto. Interna: trabalho da agência. Hub: melhoria deste sistema.
              </span>
            </div>
          )}

          {t.kind === "hub" && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={idCard} className="text-[14px] font-medium">
                Código do card
              </label>
              <input
                id={idCard}
                value={card}
                maxLength={20}
                placeholder="SS-2"
                onChange={(e) => setCard(e.target.value)}
                onBlur={() => {
                  if (card.trim() !== (t.card_ref ?? "")) salvar({ card: card.trim() || null });
                }}
                className={cn(classeCampo, "h-11")}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-medium">Situação</span>
            <Segmentos
              rotulo="Situação"
              valor={t.status}
              opcoes={situacoes.map((s) => ({ id: s, rotulo: rotuloSituacao[s] }))}
              aoEscolher={mover}
              tomAtivo={(s) => (s === "fazendo" ? "text-sit-info-t" : undefined)}
              className="max-sm:grid max-sm:grid-cols-2"
            />
          </div>

          <div className="grid gap-5">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor={idPrazo} className="text-[14px] font-medium">
                Prazo
              </label>
              <div className="flex gap-2">
                <input
                  id={idPrazo}
                  type="date"
                  value={t.due_date ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v)) salvar({ prazo: v || null });
                  }}
                  aria-describedby={aviso ? `${idPrazo}-aviso` : undefined}
                  className={cn(
                    classeCampo,
                    "h-11",
                    t.atrasada && "border-[#F3C9C4] bg-[#FFFBFA] text-sit-risco-t",
                  )}
                />
                {t.due_date && (
                  <button
                    type="button"
                    onClick={() => salvar({ prazo: null })}
                    className="inline-flex min-h-11 shrink-0 items-center px-2 text-[14px] text-hub-suave hover:text-hub-tinta"
                  >
                    Tirar
                  </button>
                )}
              </div>
              {aviso && (
                <span
                  id={`${idPrazo}-aviso`}
                  className={cn("text-[13px]", t.atrasada ? "text-sit-risco-t" : "text-hub-suave")}
                >
                  {aviso}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[14px] font-medium">Prioridade</span>
              <Segmentos
                rotulo="Prioridade"
                valor={t.priority}
                opcoes={prioridades.map((p) => ({ id: p, rotulo: rotuloPrioridade[p] }))}
                aoEscolher={(p) => salvar({ prioridade: p })}
                tomAtivo={(p) => (p === "alta" ? "text-sit-risco-t" : undefined)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={idDesc} className="text-[14px] font-medium">
              Descrição
            </label>
            <textarea
              id={idDesc}
              rows={4}
              value={descricao}
              maxLength={600}
              placeholder="O que precisa ser feito, links, detalhes…"
              onChange={(e) => setDescricao(e.target.value)}
              onBlur={() => {
                if (descricao.trim() !== (t.description ?? ""))
                  salvar({ descricao: descricao.trim() || null });
              }}
              className={cn(classeCampo, "py-2.5 leading-relaxed")}
            />
          </div>

          <dl className="flex flex-col text-[14.5px]">
            {t.pedido && (
              <div className="flex items-center justify-between gap-3 border-t border-hub-borda py-3">
                <dt className="shrink-0 text-hub-suave">Pedido de origem</dt>
                <dd className="min-w-0 text-right">
                  <Link
                    to="/app/pedidos"
                    search={{ pedido: t.pedido.id }}
                    className="inline-flex min-h-11 items-center text-[#1E3FA8] underline underline-offset-2"
                  >
                    <span className="truncate">
                      {t.pedido.codigo} · {t.pedido.titulo}
                    </span>
                  </Link>
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 border-t border-hub-borda py-2">
              <dt>
                <label htmlFor={idArea} className="text-hub-suave">
                  Área
                </label>
              </dt>
              <dd className="min-w-0">
                <input
                  id={idArea}
                  value={area}
                  maxLength={40}
                  placeholder="Geral"
                  onChange={(e) => setArea(e.target.value)}
                  onBlur={() => {
                    if (area.trim() !== (t.area ?? "")) salvar({ area: area.trim() || null });
                  }}
                  className="h-11 w-48 max-w-full rounded-lg border border-transparent px-2 text-right text-base outline-none hover:border-hub-borda focus:border-hub-tinta md:text-[14.5px]"
                />
              </dd>
            </div>
            {t.projeto && (
              <div className="flex items-center justify-between gap-3 border-t border-hub-borda py-3">
                <dt className="text-hub-suave">Ciclo</dt>
                <dd>{t.cycle}</dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 border-t border-hub-borda py-3">
              <dt className="text-hub-suave">Última mudança</dt>
              <dd className="text-right">
                {quando(t.updated_at, hoje)} · {rotuloSituacao[t.status]}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </PainelLateral>
  );
}
