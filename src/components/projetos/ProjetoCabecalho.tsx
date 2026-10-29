import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronRight,
  Library,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  XCircle,
} from "lucide-react";

import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { Selo } from "@/components/hub/Selo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { classeBotaoSecundario, classeLinkTexto } from "@/lib/estilos";
import { dataLocal, diaMes, linkWhatsapp, moeda } from "@/lib/formatar";
import { faseAtual, rotuloProjeto, type DetalheProjeto } from "@/lib/projetos";

/**
 * Cabeçalho do projeto (RD-2): faixa branca com a migalha "Projetos › Nome", selos, linha de
 * contexto e ações. Só o WhatsApp fica à vista; Editar, Materiais e Cancelar ficam em "Mais".
 * As abas da página entram no pé da faixa (RD-11).
 */
export function ProjetoCabecalho({
  d,
  aoEditar,
  aoCancelar,
  abas,
}: {
  d: DetalheProjeto;
  aoEditar: () => void;
  aoCancelar: () => void;
  abas?: ReactNode;
}) {
  const p = d.projeto;
  const atual = faseAtual(d.fases);
  const wpp = linkWhatsapp(d.cliente.whatsapp);
  const irPara = useNavigate();
  const podeCancelar = !p.canceled_at && p.status !== "concluido";
  return (
    <CabecalhoPagina
      voltarPara="/app/projetos"
      abas={abas}
      migalha={
        <nav aria-label="Caminho" className="flex min-w-0 items-center gap-1">
          <Link
            to="/app/projetos"
            className="-my-3 inline-flex min-h-11 items-center font-medium text-hub-suave hover:text-hub-tinta"
          >
            Projetos
          </Link>
          <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate" aria-current="page">
            {p.name}
          </span>
        </nav>
      }
      titulo={p.name}
      resumo={
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex flex-wrap gap-2">
            {p.canceled_at ? (
              <Selo tom="risco">Cancelado em {diaMes(p.canceled_at)}</Selo>
            ) : atual ? (
              <Selo tom="info">
                {atual.fase.name} · fase {atual.numero} de {atual.total}
              </Selo>
            ) : p.kind === "sob_medida" && p.status === "andamento" ? (
              <Selo tom="info">Por módulos</Selo>
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
          <p>
            <Link
              to="/app/clientes/$id"
              params={{ id: d.cliente.id }}
              className={`${classeLinkTexto}`}
            >
              {d.cliente.empresa}
            </Link>
            {[
              d.cliente.contato,
              d.proposta?.aceita_em ? `proposta aceita em ${diaMes(d.proposta.aceita_em)}` : null,
              p.launched_at ? `lançado em ${diaMes(p.launched_at)}` : null,
              !p.launched_at && p.launch_date
                ? `lançamento ${diaMes(dataLocal(p.launch_date))}`
                : null,
            ]
              .filter(Boolean)
              .map((x) => ` · ${x}`)
              .join("")}
          </p>
        </div>
      }
      acao={
        <>
          {wpp && (
            <a
              href={wpp}
              target="_blank"
              rel="noopener noreferrer"
              className={`${classeBotaoSecundario} max-sm:flex-1`}
            >
              <MessageCircle className="size-4" aria-hidden="true" /> WhatsApp de{" "}
              {d.cliente.contato?.split(" ")[0] ?? "contato"}
            </a>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`${classeBotaoSecundario} w-11 px-0`}
              aria-label="Mais ações: editar, materiais, cancelar"
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="min-h-11" onSelect={aoEditar}>
                <Pencil className="size-4" aria-hidden="true" /> Editar projeto
              </DropdownMenuItem>
              <DropdownMenuItem
                className="min-h-11"
                onSelect={() =>
                  void irPara({ to: "/app/materiais", search: { cliente: d.cliente.id } })
                }
              >
                <Library className="size-4" aria-hidden="true" /> Materiais do cliente
              </DropdownMenuItem>
              {podeCancelar && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="min-h-11 text-sit-risco-t" onSelect={aoCancelar}>
                    <XCircle className="size-4" aria-hidden="true" /> Cancelar projeto
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    />
  );
}
