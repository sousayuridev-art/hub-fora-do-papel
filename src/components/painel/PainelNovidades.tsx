import { Link } from "@tanstack/react-router";
import {
  BellRing,
  CheckCircle2,
  CheckSquare,
  Eye,
  Globe,
  Inbox,
  RotateCcw,
  XCircle,
} from "lucide-react";

import { diaComHora, moeda } from "@/lib/formatar";
import type { Novidade } from "@/lib/painel";
import { cn } from "@/lib/utils";

const tipos = {
  proposta_aceita: {
    icone: CheckCircle2,
    cor: "bg-sit-ok text-sit-ok-t",
    texto: "aceitou a proposta",
  },
  proposta_recusada: {
    icone: XCircle,
    cor: "bg-sit-risco text-sit-risco-t",
    texto: "não vai seguir com a proposta",
  },
  proposta_vista: { icone: Eye, cor: "bg-sit-info text-sit-info-t", texto: "abriu a proposta" },
  pedido_do_site: {
    icone: Globe,
    cor: "bg-[#FFF1D6] text-[#7A4200]",
    texto: "pediu contato pelo site",
  },
  aprovacao_aprovada: {
    icone: CheckSquare,
    cor: "bg-sit-ok text-sit-ok-t",
    texto: "aprovou uma entrega",
  },
  aprovacao_ajuste: {
    icone: RotateCcw,
    cor: "bg-sit-atencao text-sit-atencao-t",
    texto: "pediu ajuste numa entrega",
  },
  adicional_aprovado: {
    icone: CheckCircle2,
    cor: "bg-sit-ok text-sit-ok-t",
    texto: "aprovou um serviço adicional",
  },
  adicional_recusado: {
    icone: XCircle,
    cor: "bg-sit-risco text-sit-risco-t",
    texto: "recusou um serviço adicional",
  },
  pendencia_feita: {
    icone: CheckSquare,
    cor: "bg-sit-info text-sit-info-t",
    texto: "resolveu uma pendência",
  },
  pedido_recebido: {
    icone: Inbox,
    cor: "bg-[#FFF1D6] text-[#7A4200]",
    texto: "fez um pedido pelo portal",
  },
  pagamento_avisado: {
    icone: BellRing,
    cor: "bg-sit-info text-sit-info-t",
    texto: "avisou que pagou",
  },
} as const;

function complemento(n: Novidade): string | null {
  const d = n.detalhe;
  if (n.tipo === "proposta_aceita")
    return `${typeof d["total_cents"] === "number" ? moeda(d["total_cents"]) + " · " : ""}combine o início e a 1ª cobrança`;
  if (n.tipo === "proposta_recusada" && typeof d["motivo"] === "string" && d["motivo"])
    return `Motivo: ${d["motivo"]}`;
  if (n.tipo === "pedido_do_site")
    return (
      [
        d["assunto"],
        d["nao_verificado"] ? "contato que já existia: confira se é a mesma pessoa" : null,
      ]
        .filter(Boolean)
        .join(" · ") || null
    );
  if (n.tipo === "aprovacao_aprovada" || n.tipo === "pendencia_feita")
    return typeof d["titulo"] === "string" ? d["titulo"] : null;
  if (n.tipo === "aprovacao_ajuste")
    return [d["titulo"], typeof d["comentario"] === "string" ? `"${d["comentario"]}"` : null]
      .filter(Boolean)
      .join(" · ");
  if (n.tipo === "adicional_aprovado" || n.tipo === "adicional_recusado")
    return `${String(d["codigo"] ?? "")} ${String(d["titulo"] ?? "")}${
      typeof d["valor_cents"] === "number" ? ` · ${moeda(d["valor_cents"])}` : ""
    }`.trim();
  if (n.tipo === "pagamento_avisado")
    return `${String(d["descricao"] ?? "")}${
      typeof d["valor_cents"] === "number" ? ` · ${moeda(d["valor_cents"])}` : ""
    } · confira e registre em Financeiro`;
  if (n.tipo === "pedido_recebido")
    return `${String(d["codigo"] ?? "")} ${String(d["titulo"] ?? "")}`.trim();
  return null;
}

const classe = "flex min-h-14 items-start gap-3 px-5 py-3.5 hover:bg-hub-fundo";

/** Últimos 7 dias do que o cliente e o site fizeram sem o Yuri estar olhando. */
export function PainelNovidades({ itens }: { itens: Novidade[] }) {
  return (
    <section aria-labelledby="novidades-t" className="flex flex-col gap-3">
      <h2 id="novidades-t" className="font-titulo text-xl font-bold">
        Novidades dos últimos 7 dias
      </h2>
      {itens.length === 0 ? (
        <p className="rounded-2xl border border-hub-borda bg-white p-5 text-[15px] text-hub-suave">
          Nada novo. Quando um cliente abrir ou aceitar uma proposta, responder no portal ou alguém
          pedir contato pelo site, aparece aqui.
        </p>
      ) : (
        <ol className="flex flex-col rounded-2xl border border-hub-borda bg-white">
          {itens.map((n, k) => {
            const t = tipos[n.tipo];
            const Icone = t.icone;
            const extra = complemento(n);
            const conteudo = (
              <>
                <span
                  className={cn(
                    "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
                    t.cor,
                  )}
                >
                  <Icone className="size-[18px]" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[15px]">
                    <strong className="font-semibold">{n.empresa}</strong> {t.texto}
                  </span>
                  {extra && <span className="text-[13.5px] text-hub-suave">{extra}</span>}
                </span>
                <time
                  dateTime={n.quando}
                  className="shrink-0 text-[13px] text-hub-suave tabular-nums max-sm:hidden"
                >
                  {diaComHora(n.quando)}
                </time>
              </>
            );
            return (
              <li key={`${n.quando}-${k}`} className="border-b border-hub-borda last:border-b-0">
                {n.tipo === "pagamento_avisado" && typeof n.detalhe["cobranca_id"] === "string" ? (
                  <Link
                    to="/app/financeiro"
                    search={{ cobranca: n.detalhe["cobranca_id"] }}
                    className={classe}
                  >
                    {conteudo}
                  </Link>
                ) : n.project_id ? (
                  <Link to="/app/projetos/$id" params={{ id: n.project_id }} className={classe}>
                    {conteudo}
                  </Link>
                ) : (
                  <Link to="/app/clientes/$id" params={{ id: n.client_id }} className={classe}>
                    {conteudo}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
