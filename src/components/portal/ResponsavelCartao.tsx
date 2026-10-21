import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

import { linkWhatsapp, sigla } from "@/lib/formatar";

/** Quem cuida do projeto, sempre à vista no Início (card CX-5), com o atalho para falar com ele. */
export function ResponsavelCartao({
  nome,
  whatsapp,
  empresa,
  contato,
}: {
  nome: string | null;
  whatsapp: string | null;
  empresa: string;
  contato: string | null;
}) {
  const zap = linkWhatsapp(whatsapp);
  const texto = `Oi${nome ? `, ${nome.split(" ")[0]}` : ""}! Aqui é ${contato?.split(" ")[0] ?? "a equipe"}, da ${empresa}.`;
  return (
    <section aria-label="Seu responsável" className="flex flex-col gap-4">
      <span className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-full bg-hub-tinta text-[14px] font-semibold text-[#FFB020]"
        >
          {sigla(nome ?? "FP")}
        </span>
        <span className="flex flex-col leading-snug">
          <b className="text-[15.5px] font-semibold">{nome ?? "Fora do Papel"}</b>
          <span className="text-[13.5px] text-hub-suave">Responsável pelo seu projeto</span>
        </span>
      </span>
      <div className="flex flex-col gap-2">
        {zap && (
          <a
            href={`${zap}?text=${encodeURIComponent(texto)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-hub-tinta px-5 text-[15px] font-semibold hover:bg-white"
          >
            <MessageCircle className="size-4" aria-hidden="true" /> Falar no WhatsApp
          </a>
        )}
        <Link
          to="/portal/pedidos"
          className="inline-flex min-h-11 items-center justify-center text-[14.5px] font-medium underline underline-offset-4"
        >
          Fazer um pedido de ajuste
        </Link>
      </div>
    </section>
  );
}
