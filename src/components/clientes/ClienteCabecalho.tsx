import { Link } from "@tanstack/react-router";
import { MessageCircle, Pencil } from "lucide-react";

import { Selo, Sigla } from "@/components/hub/Selo";
import { situacaoDe } from "@/lib/clientes";
import { classeBotaoSecundario } from "@/lib/estilos";
import { dataLocal, diaMes, linkWhatsapp, sigla } from "@/lib/formatar";
import type { ClienteLinha } from "@/lib/funil";

/** Cabeçalho da ficha: trilha, sigla, nome, situação e ações. */
export function ClienteCabecalho({ c, aoEditar }: { c: ClienteLinha; aoEditar: () => void }) {
  const sit = situacaoDe(c);
  const wpp = linkWhatsapp(c.whatsapp);
  const detalhes = [
    c.segment,
    c.city,
    c.client_since
      ? `Cliente desde ${diaMes(dataLocal(c.client_since))}`
      : `Na base desde ${diaMes(c.created_at)}`,
  ].filter(Boolean);

  return (
    <header className="flex flex-col gap-4">
      <nav aria-label="Trilha" className="text-[14px] text-hub-suave">
        <Link to="/app/clientes" className="hover:text-hub-tinta hover:underline">
          Clientes
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-hub-tinta">{c.company_name}</span>
      </nav>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="hidden sm:block">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-hub-tinta font-titulo text-xl font-bold text-white">
              {sigla(c.company_name)}
            </span>
          </span>
          <span className="sm:hidden">
            <Sigla texto={sigla(c.company_name)} escuro />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="font-titulo text-[28px] font-bold leading-tight tracking-tight md:text-[32px]">
                {c.company_name}
              </h1>
              <Selo tom={sit.tom}>{sit.texto}</Selo>
            </div>
            <p className="text-[14.5px] text-hub-suave">{detalhes.join(" · ")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {wpp && (
            <a
              href={wpp}
              target="_blank"
              rel="noopener noreferrer"
              className={classeBotaoSecundario}
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              Abrir WhatsApp
            </a>
          )}
          <button type="button" onClick={aoEditar} className={classeBotaoSecundario}>
            <Pencil className="size-4" aria-hidden="true" />
            Editar ficha
          </button>
        </div>
      </div>
    </header>
  );
}
