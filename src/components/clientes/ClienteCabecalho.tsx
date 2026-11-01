import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { MessageCircle, MoreHorizontal } from "lucide-react";

import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { Selo, Sigla } from "@/components/hub/Selo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { situacaoDe } from "@/lib/clientes";
import { classeBotaoSecundario } from "@/lib/estilos";
import { dataLocal, diaMes, linkWhatsapp, sigla } from "@/lib/formatar";
import type { ClienteLinha } from "@/lib/funil";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho da ficha (cards S1 e RD-1): faixa com a migalha "Clientes › Empresa", selo da
 * etapa e as ações (WhatsApp e "Mais", com Editar ficha e os atalhos do cliente).
 */
export function ClienteCabecalho({
  c,
  aoEditar,
  abas,
  logo,
  relacao,
  aoLogo,
}: {
  c: ClienteLinha;
  aoEditar: () => void;
  /** Endereço da logo (RD2-5); sem ela, a sigla. */
  logo?: string | undefined;
  /** "Projeto + mensalidade" etc. no lugar da situação, para clientes (RD2-5). */
  relacao?: string | null | undefined;
  aoLogo?: () => void;
  /** Abas da ficha, presas à base do cabeçalho (card RD-9). */
  abas?: ReactNode;
}) {
  const sit = situacaoDe(c);
  const wpp = linkWhatsapp(c.whatsapp);
  const detalhes = [
    [c.contact_name, c.contact_role].filter(Boolean).join(" · "),
    c.segment,
    c.city,
    c.client_since
      ? `Cliente desde ${diaMes(dataLocal(c.client_since))}`
      : `Na base desde ${diaMes(c.created_at)}`,
  ].filter(Boolean);

  return (
    <CabecalhoPagina
      voltarPara="/app/clientes"
      abas={abas}
      migalha={
        <nav aria-label="Trilha">
          <Link to="/app/clientes" className="hover:text-hub-tinta">
            Clientes
          </Link>
          <span aria-hidden="true"> › </span>
          <span className="text-hub-tinta">{c.company_name}</span>
        </nav>
      }
      titulo={
        <span className="flex min-w-0 items-center gap-3">
          <span className="[&>*]:size-11 [&>*]:rounded-xl [&>*]:text-[15px]">
            <Sigla texto={sigla(c.company_name)} logo={logo} />
          </span>
          <span className="min-w-0">{c.company_name}</span>
        </span>
      }
      selo={
        relacao ? (
          <span className="inline-flex whitespace-nowrap rounded-full bg-[#F1F4F8] px-2.5 py-0.5 text-[12.5px] font-medium text-[#2A2D33]">
            {relacao}
          </span>
        ) : (
          <Selo tom={sit.tom}>{sit.texto}</Selo>
        )
      }
      resumo={detalhes.join(" · ")}
      acao={
        <>
          {wpp && (
            <a
              href={wpp}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(classeBotaoSecundario, "flex-1 sm:flex-none")}
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              Abrir WhatsApp
            </a>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(classeBotaoSecundario, "w-11 px-0")}
              aria-label="Mais ações da ficha"
            >
              <MoreHorizontal className="size-5" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuItem className="min-h-11" onSelect={aoEditar}>
                Editar ficha
              </DropdownMenuItem>
              {aoLogo && (
                <DropdownMenuItem className="min-h-11" onSelect={aoLogo}>
                  {logo ? "Trocar a logo" : "Pôr a logo"}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="min-h-11" asChild>
                <Link to="/app/materiais" search={{ cliente: c.id }}>
                  Materiais deste cliente
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="min-h-11" asChild>
                <Link to="/app/pedidos" search={{ cliente: c.id }}>
                  Pedidos deste cliente
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    />
  );
}
