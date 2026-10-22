import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { MessageCircle, MoreHorizontal } from "lucide-react";

import { CabecalhoPagina } from "@/components/hub/CabecalhoPagina";
import { Selo } from "@/components/hub/Selo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { situacaoDe } from "@/lib/clientes";
import { classeBotaoSecundario } from "@/lib/estilos";
import { dataLocal, diaMes, linkWhatsapp } from "@/lib/formatar";
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
}: {
  c: ClienteLinha;
  aoEditar: () => void;
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
          <Link to="/app/clientes" className="hover:text-hub-tinta hover:underline">
            Clientes
          </Link>
          <span aria-hidden="true"> › </span>
          <span className="text-hub-tinta">{c.company_name}</span>
        </nav>
      }
      titulo={c.company_name}
      selo={<Selo tom={sit.tom}>{sit.texto}</Selo>}
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
