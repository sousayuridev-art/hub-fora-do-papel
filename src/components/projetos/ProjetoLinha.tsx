import { Link } from "@tanstack/react-router";

import { gradeProjetos } from "@/lib/estilos";
import { dataLocal, diaMes, moeda } from "@/lib/formatar";
import { faseAtual, horasMin, type ProjetoResumo } from "@/lib/projetos";
import { cn } from "@/lib/utils";

function agora(p: ProjetoResumo): { texto: string; apoio: string | null } {
  const atual = faseAtual(p.fases ?? []);
  if (atual) {
    const ultima = atual.numero === atual.total;
    return {
      texto: `${atual.fase.nome} · fase ${atual.numero} de ${atual.total}`,
      apoio: ultima ? `Encerramento: ${p.checklist.feitos} de ${p.checklist.total}` : null,
    };
  }
  if (p.status === "mensalidade")
    return { texto: `Mensalidade ${p.plano ?? ""}`.trim(), apoio: null };
  if (p.status === "concluido") return { texto: "Concluído", apoio: null };
  return { texto: "Em andamento", apoio: null };
}

function lancamento(p: ProjetoResumo): { texto: string; apoio: string | null; atraso: boolean } {
  if (p.lancado_em) return { texto: diaMes(p.lancado_em), apoio: "lançado", atraso: false };
  if (!p.lancamento) return { texto: "Sem data", apoio: null, atraso: false };
  const d = p.dias_para_lancar ?? 0;
  const quando = diaMes(dataLocal(p.lancamento));
  if (d < 0)
    return { texto: quando, apoio: `${-d} ${d === -1 ? "dia" : "dias"} de atraso`, atraso: true };
  if (d === 0) return { texto: quando, apoio: "é hoje", atraso: false };
  return { texto: quando, apoio: `faltam ${d} ${d === 1 ? "dia" : "dias"}`, atraso: false };
}

/**
 * Um projeto numa linha (RD-2): projeto e cliente, momento atual e motivo de atenção,
 * lançamento, horas, o que está com o cliente e valor. A linha inteira abre o projeto.
 */
export function ProjetoLinha({ p }: { p: ProjetoResumo }) {
  const a = agora(p);
  const l = lancamento(p);
  const pct =
    p.horas_estimadas > 0 ? Math.round((p.minutos_usados / 60 / p.horas_estimadas) * 100) : null;
  const motivos = p.saude.nivel === "ok" ? [] : p.saude.motivos;
  const contato = p.contato?.split(" ")[0] ?? "o cliente";
  return (
    <Link
      to="/app/projetos/$id"
      params={{ id: p.id }}
      className={cn(
        "grid gap-x-4 gap-y-1.5 px-4 py-4 transition-colors hover:bg-hub-fundo max-lg:rounded-2xl max-lg:border max-lg:bg-white lg:items-center lg:px-5",
        gradeProjetos,
        p.saude.nivel === "risco" ? "max-lg:border-[#F3D3CF]" : "max-lg:border-hub-borda",
      )}
    >
      <span className="flex min-w-0 items-start justify-between gap-3 lg:flex-col lg:justify-start lg:gap-0">
        <span className="flex min-w-0 flex-col">
          <b className="truncate text-[15.5px] font-semibold">{p.nome}</b>
          <span className="truncate text-[13.5px] text-hub-suave">
            {p.empresa}
            {p.contato ? ` · ${p.contato}` : ""}
          </span>
        </span>
        <span
          className={cn(
            "shrink-0 text-[13px] lg:hidden",
            l.atraso ? "text-sit-risco-t" : "text-hub-suave",
          )}
        >
          {l.texto}
        </span>
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[14.5px]">{a.texto}</span>
        {a.apoio && <span className="text-[13px] text-hub-suave">{a.apoio}</span>}
        {motivos.length > 0 && (
          <span
            className={cn(
              "text-[13px]",
              p.saude.nivel === "risco" ? "text-sit-risco-t" : "text-sit-atencao-t",
            )}
          >
            {motivos[0]?.texto}
            {motivos.length > 1 ? ` (+${motivos.length - 1})` : ""}
          </span>
        )}
      </span>
      <span className="hidden flex-col lg:flex">
        <span className="text-[14.5px] tabular-nums">{l.texto}</span>
        {l.apoio && (
          <span className={cn("text-[13px]", l.atraso ? "text-sit-risco-t" : "text-hub-suave")}>
            {l.apoio}
          </span>
        )}
      </span>
      <span className="flex flex-col gap-1.5">
        <span className="text-[13.5px] tabular-nums lg:text-[14.5px]">
          <span className="text-hub-suave lg:hidden">Horas: </span>
          {horasMin(p.minutos_usados)}{" "}
          <span className="text-hub-suave">de {p.horas_estimadas.toLocaleString("pt-BR")} h</span>
        </span>
        {pct !== null && (
          <span
            aria-hidden="true"
            className="h-1 overflow-hidden rounded-full bg-[#E6E6E0] max-lg:hidden"
          >
            <span
              className={cn(
                "block h-full rounded-full",
                pct >= 100 ? "bg-[#9A1C12]" : pct >= 80 ? "bg-[#D48A00]" : "bg-hub-tinta",
              )}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </span>
        )}
      </span>
      <span className="flex flex-col text-[13.5px] lg:text-[14.5px]">
        <span className={p.aguardando_cliente === 0 ? "text-hub-suave" : ""}>
          {p.aguardando_cliente === 0 ? "Nada pendente" : `${p.aguardando_cliente} com ${contato}`}
        </span>
        {p.pendencias_atrasadas > 0 && (
          <span className="text-[13px] text-sit-risco-t">
            {p.pendencias_atrasadas} {p.pendencias_atrasadas === 1 ? "atrasada" : "atrasadas"}
          </span>
        )}
      </span>
      <span className="hidden flex-col text-right lg:flex">
        <b className="text-[14.5px] font-semibold tabular-nums">{moeda(p.valor_cents)}</b>
        {p.plano && p.mensal_cents ? (
          <span className="text-[13px] text-hub-suave">+ {moeda(p.mensal_cents)}/mês</span>
        ) : null}
      </span>
    </Link>
  );
}
