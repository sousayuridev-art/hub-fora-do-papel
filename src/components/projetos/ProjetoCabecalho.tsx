import { Link } from "@tanstack/react-router";
import { ChevronRight, MessageCircle } from "lucide-react";

import { Selo } from "@/components/hub/Selo";
import { classeBotaoSecundario } from "@/lib/estilos";
import { dataLocal, diaMes, linkWhatsapp, moeda } from "@/lib/formatar";
import { faseAtual, rotuloProjeto, type DetalheProjeto } from "@/lib/projetos";

/** Caminho, selos, nome do projeto e atalhos para o cliente. */
export function ProjetoCabecalho({ d }: { d: DetalheProjeto }) {
  const p = d.projeto;
  const atual = faseAtual(d.fases);
  const wpp = linkWhatsapp(d.cliente.whatsapp);
  return (
    <header className="flex flex-col gap-4">
      <nav
        aria-label="Caminho"
        className="flex min-w-0 items-center gap-1 text-[14px] text-hub-suave"
      >
        <Link to="/app/projetos" className="inline-flex min-h-11 items-center hover:text-hub-tinta">
          Projetos
        </Link>
        <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
        <Link
          to="/app/clientes/$id"
          params={{ id: d.cliente.id }}
          className="inline-flex min-h-11 min-w-0 items-center truncate hover:text-hub-tinta"
        >
          {d.cliente.empresa}
        </Link>
      </nav>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {atual ? (
              <Selo tom="info">
                {atual.fase.name} · fase {atual.numero} de {atual.total}
              </Selo>
            ) : (
              <Selo tom="ok">{rotuloProjeto[p.status]}</Selo>
            )}
            {p.plan_name && (
              <Selo tom="neutro">
                Mensalidade {p.plan_name}
                {p.monthly_cents ? ` · ${moeda(p.monthly_cents)}/mês` : ""}
              </Selo>
            )}
          </div>
          <h1 className="font-titulo text-[28px] font-bold leading-tight tracking-tight md:text-[32px]">
            {p.name}
          </h1>
          <p className="text-[15px] text-hub-suave">
            {[
              d.cliente.empresa,
              d.cliente.contato,
              d.proposta?.aceita_em ? `Proposta aceita em ${diaMes(d.proposta.aceita_em)}` : null,
              p.launched_at ? `Lançado em ${diaMes(p.launched_at)}` : null,
              !p.launched_at && p.launch_date
                ? `Lançamento ${diaMes(dataLocal(p.launch_date))}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {wpp && (
          <a href={wpp} target="_blank" rel="noopener noreferrer" className={classeBotaoSecundario}>
            <MessageCircle className="size-4" aria-hidden="true" /> WhatsApp de{" "}
            {d.cliente.contato?.split(" ")[0] ?? "contato"}
          </a>
        )}
      </div>
    </header>
  );
}
