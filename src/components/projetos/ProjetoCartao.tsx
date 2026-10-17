import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Selo, Sigla } from "@/components/hub/Selo";
import { LinhaFases } from "@/components/projetos/LinhaFases";
import { SaudeEntrega } from "@/components/projetos/SaudeEntrega";
import { classeBotaoSecundario } from "@/lib/estilos";
import { dataLocal, diaMes, moeda, sigla } from "@/lib/formatar";
import { faseAtual, horasMin, type ProjetoResumo } from "@/lib/projetos";
import { cn } from "@/lib/utils";

function textoLancamento(p: ProjetoResumo): string {
  if (p.lancado_em) return `Lançado em ${diaMes(p.lancado_em)}`;
  if (!p.lancamento) return "Lançamento sem data";
  const d = p.dias_para_lancar ?? 0;
  const quando = diaMes(dataLocal(p.lancamento));
  if (d < 0) return `Lançamento era ${quando} · ${-d} ${-d === 1 ? "dia" : "dias"} de atraso`;
  if (d === 0) return `Lança hoje, ${quando}`;
  return `Lança em ${quando} · faltam ${d} ${d === 1 ? "dia" : "dias"}`;
}

/** Um projeto na lista: fases, horas, pendências com o cliente e encerramento. */
export function ProjetoCartao({ p }: { p: ProjetoResumo }) {
  const fases = p.fases ?? [];
  const atual = faseAtual(fases);
  const usadas = p.minutos_usados / 60;
  const pct = p.horas_estimadas > 0 ? Math.round((usadas / p.horas_estimadas) * 100) : null;
  const ultimaFase = atual && atual.numero === atual.total;

  return (
    <article className="flex flex-col rounded-2xl border border-hub-borda bg-white">
      <header className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Sigla texto={sigla(p.empresa)} escuro />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[14px] text-hub-suave">
              {p.empresa}
              {p.contato ? ` · ${p.contato}` : ""}
            </span>
            <h2 className="font-titulo text-[19px] font-bold leading-snug">
              <Link
                to="/app/projetos/$id"
                params={{ id: p.id }}
                className="-my-2 inline-block py-2 hover:underline"
              >
                {p.nome}
              </Link>
            </h2>
          </div>
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          {atual ? (
            <Selo tom="info">
              {atual.fase.nome} · fase {atual.numero} de {atual.total}
            </Selo>
          ) : (
            <Selo tom="ok">
              {p.status === "mensalidade" ? `Mensalidade ${p.plano ?? ""}` : "Concluído"}
            </Selo>
          )}
          <span
            className={cn(
              "text-[14px]",
              (p.dias_para_lancar ?? 1) < 0 && !p.lancado_em
                ? "text-sit-risco-t"
                : "text-hub-suave",
            )}
          >
            {textoLancamento(p)}
          </span>
        </div>
      </header>

      {p.saude.nivel !== "ok" && (
        <div className="px-5 pb-4">
          <SaudeEntrega saude={p.saude} />
        </div>
      )}
      {fases.length > 0 && (
        <div className="px-5 pb-5">
          <LinhaFases fases={fases} compacta />
        </div>
      )}

      <dl className="grid border-t border-hub-borda sm:grid-cols-3">
        <div className="flex flex-col gap-1.5 border-hub-borda p-5 max-sm:border-b sm:border-r">
          <dt className="font-rotulo text-[12.5px] font-semibold uppercase tracking-[0.08em] text-hub-suave">
            Horas usadas
          </dt>
          <dd className="flex items-center gap-2 font-semibold tabular-nums">
            {horasMin(p.minutos_usados)} de {p.horas_estimadas.toLocaleString("pt-BR")} h
            {pct !== null && (
              <span
                className={cn(
                  "rounded-md px-1.5 text-[13px] font-medium",
                  pct >= 100
                    ? "bg-sit-risco text-sit-risco-t"
                    : pct >= 80
                      ? "bg-sit-atencao text-sit-atencao-t"
                      : "bg-sit-neutro",
                )}
              >
                {pct}%
              </span>
            )}
          </dd>
          {pct !== null && (
            <dd aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-[#E6E6E0]">
              <span
                className={cn(
                  "block h-full rounded-full",
                  pct >= 100 ? "bg-[#9A1C12]" : pct >= 80 ? "bg-[#D48A00]" : "bg-hub-tinta",
                )}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </dd>
          )}
        </div>
        <div className="flex flex-col gap-1.5 border-hub-borda p-5 max-sm:border-b sm:border-r">
          <dt className="font-rotulo text-[12.5px] font-semibold uppercase tracking-[0.08em] text-hub-suave">
            Pendências com o cliente
          </dt>
          <dd className="font-semibold tabular-nums">
            {p.aguardando_cliente === 0
              ? "Nada pendente"
              : `${p.aguardando_cliente} aguardando ${p.contato?.split(" ")[0] ?? "o cliente"}`}
          </dd>
          {p.pendencias_atrasadas > 0 && (
            <dd>
              <Selo tom="risco">
                {p.pendencias_atrasadas} {p.pendencias_atrasadas === 1 ? "atrasada" : "atrasadas"}
              </Selo>
            </dd>
          )}
        </div>
        <div className="flex flex-col gap-1.5 p-5">
          <dt className="font-rotulo text-[12.5px] font-semibold uppercase tracking-[0.08em] text-hub-suave">
            {ultimaFase ? "Encerramento" : "Valor do projeto"}
          </dt>
          {ultimaFase ? (
            <dd className="font-semibold tabular-nums">
              Checklist {p.checklist.feitos} de {p.checklist.total}
            </dd>
          ) : (
            <dd className="font-semibold tabular-nums">{moeda(p.valor_cents)}</dd>
          )}
        </div>
      </dl>

      <footer className="flex flex-col gap-3 border-t border-hub-borda bg-hub-fundo/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[14px] text-hub-suave">
          {p.plano
            ? `Mensalidade ${p.plano}${p.mensal_cents ? `, ${moeda(p.mensal_cents)} por mês` : ""}, depois do lançamento.`
            : "Sem mensalidade combinada."}
        </span>
        <Link
          to="/app/projetos/$id"
          params={{ id: p.id }}
          className={cn(classeBotaoSecundario, "max-sm:w-full")}
        >
          Abrir projeto <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </footer>
    </article>
  );
}
