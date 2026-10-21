import { useState } from "react";
import { Copy, Mail, MessageCircle } from "lucide-react";

import { PainelLateral } from "@/components/hub/PainelLateral";
import { classeBotaoSecundario } from "@/lib/estilos";
import { linkWhatsapp } from "@/lib/formatar";
import { linkEmail, type Mensagem } from "@/lib/mensagens";
import { erro, ok } from "@/lib/notify";
import { cn } from "@/lib/utils";

type Canal = "whatsapp" | "email";

/**
 * Painel "Enviar para" (card CX-2): o texto vem pronto (lib/mensagens), com nota pessoal opcional,
 * prévia de como o link chega e uma ação principal. O envio sai do WhatsApp ou do aplicativo de
 * e-mail de quem envia; o Hub não manda nada sozinho.
 */
export function EnviarParaPainel({
  aberto,
  aoMudar,
  nome,
  whatsapp,
  email,
  link,
  previa,
  aviso,
  gerar,
}: {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  nome: string | null;
  whatsapp: string | null;
  email: string | null;
  link: string;
  /** Como o link aparece para o cliente: título e linha de apoio. */
  previa: { titulo: string; linha: string };
  /** Linha de confiança no rodapé, só quando é verdade (ex.: aviso de abertura da proposta). */
  aviso?: string | undefined;
  gerar: (nota: string) => Mensagem;
}) {
  const zap = linkWhatsapp(whatsapp);
  const [canal, setCanal] = useState<Canal>(zap || !email ? "whatsapp" : "email");
  const [nota, setNota] = useState("");
  const m = gerar(nota);
  const destino =
    canal === "whatsapp"
      ? zap
        ? `${zap}?text=${encodeURIComponent(m.whatsapp)}`
        : null
      : linkEmail(email, m);
  const primeiro = (nome ?? "").split(" ")[0] || "o cliente";

  async function copiar(texto: string, aviso: string) {
    try {
      await navigator.clipboard.writeText(texto);
      ok(aviso);
    } catch {
      erro("Não foi possível copiar. Selecione o texto e copie.");
    }
  }

  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo={`Enviar para ${primeiro}`}
      descricao="O texto já vem pronto. Acrescente uma nota se quiser."
      rodape={
        <>
          <button
            type="button"
            className={cn(classeBotaoSecundario, "h-12")}
            onClick={() => void copiar(link, "Link copiado.")}
          >
            <Copy className="size-4" aria-hidden="true" /> Copiar link
          </button>
          {destino ? (
            <a
              href={destino}
              target={canal === "whatsapp" ? "_blank" : undefined}
              rel="noopener noreferrer"
              onClick={() => aoMudar(false)}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-hub-destaque px-5 text-[15px] font-semibold text-hub-tinta hover:brightness-95"
            >
              {canal === "whatsapp" ? (
                <MessageCircle className="size-4" aria-hidden="true" />
              ) : (
                <Mail className="size-4" aria-hidden="true" />
              )}
              {canal === "whatsapp" ? "Abrir no WhatsApp" : "Abrir no e-mail"}
            </a>
          ) : (
            <button
              type="button"
              className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-hub-fundo px-5 text-[14px] text-hub-suave"
              onClick={() =>
                void copiar(
                  canal === "whatsapp" ? m.whatsapp : `${m.assunto}\n\n${m.email}`,
                  "Texto copiado.",
                )
              }
            >
              {canal === "whatsapp"
                ? "Sem WhatsApp cadastrado: copiar texto"
                : "Sem e-mail cadastrado: copiar texto"}
            </button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div
          role="tablist"
          aria-label="Canal"
          className="grid grid-cols-2 gap-1 rounded-xl bg-[#F1F1EC] p-1"
        >
          {(["whatsapp", "email"] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={canal === c}
              onClick={() => setCanal(c)}
              className={cn(
                "h-11 rounded-[9px] text-[14px] font-medium text-hub-suave",
                canal === c &&
                  "bg-white font-semibold text-hub-tinta shadow-[0_1px_2px_rgba(14,16,19,0.12)]",
              )}
            >
              {c === "whatsapp" ? "WhatsApp" : "E-mail"}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-hub-suave">Como o link chega</span>
          <div className="flex items-center gap-3 rounded-xl border border-hub-borda p-3">
            <span
              aria-hidden="true"
              className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-hub-tinta"
            >
              <span className="relative block size-6">
                <span className="absolute bottom-0 left-0 size-4 rounded-[2px] border-2 border-hub-fundo" />
                <span className="absolute right-0 top-0 size-3.5 rounded-[2px] bg-hub-destaque" />
              </span>
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[14.5px] font-semibold">{previa.titulo}</span>
              <span className="block truncate text-[13px] text-hub-suave">{previa.linha}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-hub-suave">
            {canal === "whatsapp" ? "Mensagem" : `Assunto: ${m.assunto}`}
          </span>
          <p className="whitespace-pre-line rounded-xl bg-hub-fundo p-4 text-[14px] leading-relaxed">
            {canal === "whatsapp" ? m.whatsapp : m.email}
          </p>
        </div>

        <label className="flex flex-col gap-2 text-[14px] font-medium">
          Nota pessoal (opcional)
          <textarea
            rows={2}
            value={nota}
            maxLength={280}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ex.: Qualquer dúvida, me chama por aqui."
            className="resize-none rounded-xl border border-[#DADAD3] px-3 py-2.5 text-base font-normal outline-none focus:border-hub-tinta md:text-[15px]"
          />
        </label>

        {aviso && <p className="text-[13px] text-sit-ok-t">{aviso}</p>}
      </div>
    </PainelLateral>
  );
}
