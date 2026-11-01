import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";

import { chavesFinanceiro, financeiroDoProjeto } from "@/lib/financeiro";
import { dataLocal, diaMes, linkWhatsapp, moeda } from "@/lib/formatar";
import { horasMin, type DetalheProjeto, type Tarefa } from "@/lib/projetos";
import { rotuloSituacaoPedido } from "@/lib/pedidos";
import { classeAcaoTexto } from "@/lib/estilos";
import { cn } from "@/lib/utils";

/** Anel de andamento (tarefas prontas sobre o total). */
function Anel({ pct }: { pct: number }) {
  const r = 30;
  const volta = 2 * Math.PI * r;
  return (
    <svg width="64" height="64" viewBox="0 0 72 72" role="img" aria-label={`${pct}% concluído`}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="#E9EDF2" strokeWidth="8" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="var(--color-hub-tinta)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * volta} ${volta}`}
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="41" textAnchor="middle" fontSize="16" fontWeight="600" fill="currentColor">
        {pct}%
      </text>
    </svg>
  );
}

function Barra({ pct, alerta = false }: { pct: number; alerta?: boolean }) {
  return (
    <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-full bg-[#E9EDF2]">
      <span
        className={cn("block h-full rounded-full", alerta ? "bg-sit-risco-t" : "bg-hub-tinta")}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </span>
  );
}

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section
      aria-label={titulo}
      className="flex flex-col gap-3 rounded-2xl border border-[#E3E7ED] bg-white p-5"
    >
      <h2 className="text-[15.5px] font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}

/**
 * Coluna da direita da página do projeto (RD2-4): andamento, ida ao ar, horas, recebido,
 * mensalidade, contato e pedidos. O trabalho fica à esquerda.
 */
export function ProjetoResumo({
  d,
  tarefas,
  aoVerPedidos,
}: {
  d: DetalheProjeto;
  tarefas: Tarefa[];
  aoVerPedidos: () => void;
}) {
  const p = d.projeto;
  const fin = useQuery({
    queryKey: chavesFinanceiro.projeto(p.id),
    queryFn: () => financeiroDoProjeto(p.id),
  });
  const prontas = tarefas.filter((t) => t.status === "pronto").length;
  const pct = tarefas.length ? Math.round((prontas / tarefas.length) * 100) : 0;
  const horasPct =
    p.hours_estimated > 0 ? Math.round((d.minutos_usados / 60 / p.hours_estimated) * 100) : null;
  const dias = p.launch_date
    ? Math.round((dataLocal(p.launch_date).getTime() - dataLocal(d.hoje).getTime()) / 86_400_000)
    : null;
  const wpp = linkWhatsapp(d.cliente.whatsapp);
  const abertos = d.pedidos.filter((x) => x.status !== "pronto" && x.status !== "recusado");

  return (
    <aside aria-label="Resumo do projeto" className="flex min-w-0 flex-col gap-4">
      <Cartao titulo="Resumo">
        <div className="flex items-center gap-4">
          <Anel pct={pct} />
          <div className="text-[13px] text-hub-suave">
            {p.launched_at ? (
              <>
                No ar desde
                <b className="block text-[20px] font-semibold text-hub-tinta">
                  {diaMes(p.launched_at)}
                </b>
              </>
            ) : (
              <>
                Vai ao ar em
                <b className="block text-[20px] font-semibold text-hub-tinta">
                  {p.launch_date ? diaMes(dataLocal(p.launch_date)) : "sem data"}
                </b>
                <span className={cn(dias !== null && dias < 0 && "font-medium text-sit-risco-t")}>
                  {dias === null
                    ? "Defina no Encerramento"
                    : dias < 0
                      ? `${-dias} ${dias === -1 ? "dia" : "dias"} de atraso`
                      : dias === 0
                        ? "é hoje"
                        : `faltam ${dias} ${dias === 1 ? "dia" : "dias"}`}
                </span>
              </>
            )}
          </div>
        </div>
        <p className="text-[13px] text-hub-suave">
          {prontas} de {tarefas.length} {tarefas.length === 1 ? "tarefa pronta" : "tarefas prontas"}
        </p>
        <div className="flex flex-col gap-1.5 border-t border-[#EEF1F5] pt-3">
          <div className="flex justify-between gap-3 text-[14px]">
            <span className="text-hub-suave">Horas</span>
            <b className="font-medium">
              {horasMin(d.minutos_usados)}
              {p.hours_estimated > 0 ? ` de ${p.hours_estimated.toLocaleString("pt-BR")} h` : ""}
            </b>
          </div>
          {horasPct !== null && <Barra pct={horasPct} alerta={horasPct >= 100} />}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between gap-3 text-[14px]">
            <span className="text-hub-suave">Recebido</span>
            <b className="font-medium">
              {fin.data && fin.data.total_cents > 0
                ? `${moeda(fin.data.pago_cents)} de ${moeda(fin.data.total_cents)}`
                : moeda(p.value_cents)}
            </b>
          </div>
          {fin.data && fin.data.total_cents > 0 && (
            <Barra pct={(fin.data.pago_cents / fin.data.total_cents) * 100} />
          )}
          {fin.data?.proxima && (
            <span className="text-[12.5px] text-hub-suave">
              Próxima: {moeda(fin.data.proxima.valor_cents)}{" "}
              {fin.data.proxima.vencimento
                ? `em ${diaMes(dataLocal(fin.data.proxima.vencimento))}`
                : "na entrega"}
            </span>
          )}
        </div>
        {p.plan_name && (
          <div className="flex justify-between gap-3 text-[14px]">
            <span className="text-hub-suave">Mensalidade</span>
            <b className="text-right font-medium">
              {p.plan_name}
              {p.monthly_cents ? ` · ${moeda(p.monthly_cents)}` : ""}
            </b>
          </div>
        )}
      </Cartao>

      <Cartao titulo="Contato">
        <div className="flex justify-between gap-3 text-[14px]">
          <span className="text-hub-suave">Responsável</span>
          <b className="truncate font-medium">{d.cliente.contato ?? "Sem nome"}</b>
        </div>
        {d.cliente.email && (
          <div className="flex justify-between gap-3 text-[14px]">
            <span className="text-hub-suave">E-mail</span>
            <span className="truncate">{d.cliente.email}</span>
          </div>
        )}
        {wpp && (
          <a
            href={wpp}
            target="_blank"
            rel="noopener noreferrer"
            className={`${classeAcaoTexto} self-start`}
          >
            <MessageCircle className="size-4" aria-hidden="true" /> Abrir WhatsApp
          </a>
        )}
      </Cartao>

      <Cartao titulo="Pedidos">
        {abertos.length === 0 ? (
          <p className="text-[14px] text-hub-suave">Nenhum pedido aberto neste projeto.</p>
        ) : (
          <ul className="flex flex-col">
            {abertos.slice(0, 3).map((x) => (
              <li
                key={x.id}
                className="flex justify-between gap-3 border-t border-[#EEF1F5] py-2 text-[14px] first:border-t-0 first:pt-0"
              >
                <span className="min-w-0 truncate">
                  {x.code} · {x.title}
                </span>
                <span className="shrink-0 text-hub-suave">{rotuloSituacaoPedido[x.status]}</span>
              </li>
            ))}
          </ul>
        )}
        {d.pedidos.length > 0 && (
          <button type="button" className={`${classeAcaoTexto} self-start`} onClick={aoVerPedidos}>
            Ver todos ({d.pedidos.length}) ⌄
          </button>
        )}
      </Cartao>
    </aside>
  );
}
