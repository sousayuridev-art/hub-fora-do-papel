import { Link } from "@tanstack/react-router";

import { Selo } from "@/components/hub/Selo";
import { diaComHora, diaMes, moeda } from "@/lib/formatar";
import { etapaDoPedido, type PedidoPortal } from "@/lib/portal";
import { cn } from "@/lib/utils";

function rotuloDecisao(p: PedidoPortal): string {
  if (p.classificacao === "adicional") return "Serviço adicional";
  if (p.classificacao === "escopo") return "Sem custo";
  if (p.classificacao === "mensalidade") return "Na mensalidade";
  return "Sem custo ou serviço adicional";
}

function seloDe(p: PedidoPortal): {
  texto: string;
  tom: "neutro" | "info" | "atencao" | "risco" | "ok";
} {
  switch (p.status) {
    case "recebido":
      return { texto: "Recebido", tom: "neutro" };
    case "em_analise":
      return p.decisao === "aprovado"
        ? { texto: "Aprovado por você", tom: "info" }
        : { texto: "Em análise", tom: "info" };
    case "aguardando_cliente":
      return { texto: "Aguardando sua decisão", tom: "atencao" };
    case "fazendo":
      return { texto: "Fazendo", tom: "info" };
    case "pronto":
      return { texto: "Pronto", tom: "ok" };
    case "recusado":
      return {
        texto: p.decisao === "recusado" ? "Você preferiu não fazer" : "Não será feito",
        tom: "risco",
      };
  }
}

function resumo(p: PedidoPortal): string {
  if (p.status === "pronto") return `Pronto em ${p.pronto_em ? diaMes(p.pronto_em) : "—"}.`;
  if (p.status === "recusado") return p.nota ?? "Este pedido não será feito.";
  if (p.status === "aguardando_cliente")
    return `Virou serviço adicional: ${p.horas?.toLocaleString("pt-BR")} h, ${moeda(p.valor_cents)}. Decida em Aprovações.`;
  if (p.classificacao === "escopo") return "Está dentro do que combinamos. Sem custo.";
  if (p.classificacao === "mensalidade") return "Usa as horas da sua mensalidade.";
  return `Recebido ${diaComHora(p.criado_em)}.`;
}

const etapas = ["Recebido", "Em análise", "", "Fazendo", "Pronto"];

/** Um pedido com as 5 etapas sempre à vista. */
export function PedidoPortalCartao({ p }: { p: PedidoPortal }) {
  const atual = etapaDoPedido(p);
  const selo = seloDe(p);
  const pronto = p.status === "pronto";
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-hub-borda bg-white p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[#F1F1EC] px-2 py-0.5 font-rotulo text-[13px]">
              {p.codigo}
            </span>
            <Selo tom={selo.tom}>{selo.texto}</Selo>
          </div>
          <h3 className="font-titulo text-[18px] font-bold leading-snug md:text-[20px]">
            {p.titulo}
          </h3>
          <p className="text-[14.5px] text-hub-suave">{resumo(p)}</p>
        </div>
        {p.status === "aguardando_cliente" && (
          <Link
            to="/portal/aprovacoes"
            hash={p.id}
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-hub-tinta px-5 text-[15px] font-semibold text-white max-md:w-full"
          >
            Decidir em Aprovações
          </Link>
        )}
      </div>
      {atual >= 0 && (
        <ol aria-label="Etapas do pedido" className="grid grid-cols-5 gap-1.5 md:gap-2">
          {etapas.map((nome, i) => {
            const rotulo = i === 2 ? rotuloDecisao(p) : nome;
            const feito = i < atual || pronto;
            const agora = i === atual && !pronto;
            return (
              <li key={i} className="flex min-w-0 flex-col gap-1.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-1.5 rounded-full",
                    pronto
                      ? "bg-[#145A37]"
                      : feito
                        ? "bg-hub-tinta"
                        : agora
                          ? "bg-[#FFB020]"
                          : "bg-[#E6E6E0]",
                  )}
                />
                <span
                  className={cn(
                    "text-[12.5px] leading-tight max-md:hidden",
                    pronto
                      ? "font-medium text-sit-ok-t"
                      : agora
                        ? "font-semibold"
                        : "text-hub-suave",
                  )}
                >
                  {rotulo}
                </span>
                <span className="sr-only">
                  {rotulo}: {feito ? "feito" : agora ? "etapa atual" : "ainda não"}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {atual >= 0 && !pronto && (
        <p className="text-[13px] text-hub-suave md:hidden">
          Etapa {atual + 1} de 5: {atual === 2 ? rotuloDecisao(p) : etapas[atual]}
        </p>
      )}
    </article>
  );
}
