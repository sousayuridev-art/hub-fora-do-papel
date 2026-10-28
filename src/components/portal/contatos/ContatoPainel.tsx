import { Check, MessageCircle, RotateCcw } from "lucide-react";

import { PainelLateral } from "@/components/hub/PainelLateral";
import { Button } from "@/components/ui/button";
import { diaComHora } from "@/lib/formatar";
import { linkWhatsApp, telefoneLegivel, type ContatoSite } from "@/lib/contatosSite";

/** Detalhe do contato: mensagem, situação, "Responder no WhatsApp" e "Já respondi". */
export function ContatoPainel({
  c,
  empresa,
  aoFechar,
  aoMarcar,
}: {
  c: ContatoSite | null;
  empresa: string;
  aoFechar: () => void;
  aoMarcar: (id: string, respondido: boolean) => void;
}) {
  const link = c ? linkWhatsApp(c, empresa) : null;
  const formulario = c?.origem === "formulario";
  return (
    <PainelLateral
      aberto={c !== null}
      aoMudar={(v) => !v && aoFechar()}
      titulo={c ? (formulario ? (c.nome ?? "Contato") : "Clique no WhatsApp") : "Contato"}
      descricao={
        c
          ? `${formulario ? "Formulário do site" : "Botão do WhatsApp"}${c.pagina ? ` · ${c.pagina}` : ""} · ${diaComHora(c.criado_em)}`
          : undefined
      }
      rodape={
        c &&
        formulario && (
          <>
            {c.respondido ? (
              <Button
                variant="outline"
                className="h-12 max-sm:w-full sm:mr-auto"
                onClick={() => aoMarcar(c.id, false)}
              >
                <RotateCcw className="size-4" aria-hidden="true" /> Ainda não respondi
              </Button>
            ) : (
              <Button
                variant="outline"
                className="h-12 max-sm:w-full sm:mr-auto"
                onClick={() => {
                  aoMarcar(c.id, true);
                  aoFechar();
                }}
              >
                <Check className="size-4" aria-hidden="true" /> Já respondi
              </Button>
            )}
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="botao-degrade inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold text-hub-tinta max-sm:w-full"
              >
                <MessageCircle className="size-4" aria-hidden="true" /> Responder no WhatsApp
              </a>
            )}
          </>
        )
      }
    >
      {c && (
        <div className="flex flex-col gap-5">
          {formulario ? (
            <>
              <p className="whitespace-pre-line rounded-2xl bg-hub-fundo p-4 text-[15.5px] leading-relaxed">
                {c.mensagem ?? "A pessoa não escreveu mensagem."}
              </p>
              <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[14.5px]">
                {c.telefone && (
                  <>
                    <dt className="text-hub-suave">WhatsApp</dt>
                    <dd className="tabular-nums">{telefoneLegivel(c.telefone)}</dd>
                  </>
                )}
                {c.email && (
                  <>
                    <dt className="text-hub-suave">E-mail</dt>
                    <dd className="break-all">{c.email}</dd>
                  </>
                )}
                <dt className="text-hub-suave">Situação</dt>
                <dd className={c.respondido ? "text-[#145A37]" : "text-sit-atencao-t"}>
                  {c.respondido
                    ? `Respondido${c.respondido_em ? ` em ${diaComHora(c.respondido_em)}` : ""}`
                    : "Esperando resposta"}
                </dd>
              </dl>
              {link ? (
                <p className="text-[13.5px] text-hub-suave">
                  O WhatsApp abre com uma mensagem pronta; você revisa antes de enviar.
                </p>
              ) : (
                <p className="text-[13.5px] text-hub-suave">
                  A pessoa deixou só o e-mail. Responda por lá e marque como respondido.
                </p>
              )}
            </>
          ) : (
            <p className="text-[15px]">
              Alguém tocou no botão do WhatsApp{c.pagina ? ` na página ${c.pagina}` : ""}. A
              conversa continua no WhatsApp do seu negócio; não há nada para responder aqui.
            </p>
          )}
        </div>
      )}
    </PainelLateral>
  );
}
