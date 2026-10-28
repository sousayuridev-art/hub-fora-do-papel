import { FileText, MessageCircle } from "lucide-react";

import { diaComHora } from "@/lib/formatar";
import type { ContatoSite } from "@/lib/contatosSite";
import { cn } from "@/lib/utils";

/** Linha da caixa de contatos: quem, de onde, trecho, quando e de qual página. */
export function ContatoLinha({ c, aoAbrir }: { c: ContatoSite; aoAbrir: () => void }) {
  const whatsapp = c.origem === "whatsapp";
  const Icone = whatsapp ? MessageCircle : FileText;
  return (
    <button
      type="button"
      onClick={aoAbrir}
      className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-hub-fundo focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-hub-tinta"
    >
      <span
        className={cn(
          "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full",
          whatsapp ? "bg-[#E3F4EA] text-[#145A37]" : "bg-hub-fundo text-hub-suave",
        )}
        aria-hidden="true"
      >
        <Icone className="size-[18px]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className="truncate text-[15px] font-semibold">
            {whatsapp ? "Clique no WhatsApp" : (c.nome ?? "Sem nome")}
          </span>
          {!whatsapp && !c.respondido && (
            <span
              className="size-2 shrink-0 rounded-full bg-[#FFB020]"
              aria-label="Esperando resposta"
            />
          )}
        </span>
        <span className="truncate text-[14px] text-hub-suave">
          {whatsapp
            ? "A pessoa tocou no botão do WhatsApp; a conversa continua lá."
            : (c.mensagem ?? "Sem mensagem")}
        </span>
        <span className="text-[13px] text-hub-suave">
          {diaComHora(c.criado_em)}
          {c.pagina ? ` · página ${c.pagina}` : ""}
        </span>
      </span>
    </button>
  );
}
