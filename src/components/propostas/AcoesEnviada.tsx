import { Copy, Eye, MessageCircle, PencilLine, XCircle } from "lucide-react";

import { Selo } from "@/components/hub/Selo";
import { classeBotaoSecundario } from "@/lib/estilos";
import { diaComHora, diaMes, linkWhatsapp, moeda } from "@/lib/formatar";
import { erro, ok } from "@/lib/notify";
import { linkDaProposta, type DetalheProposta } from "@/lib/propostas";
import { cn } from "@/lib/utils";

/** Painel da proposta já enviada: situação, link, WhatsApp e ações. */
export function AcoesEnviada({
  detalhe,
  aoReabrir,
  aoMarcarRecusada,
  aoVerComoCliente,
  ocupado,
}: {
  detalhe: DetalheProposta;
  aoReabrir: () => void;
  aoMarcarRecusada: () => void;
  aoVerComoCliente: () => void;
  ocupado: boolean;
}) {
  const p = detalhe.proposta;
  const link = p.token ? linkDaProposta(p.token) : null;
  const vencida =
    p.status === "enviada" && p.expires_at != null && new Date(p.expires_at) < new Date();
  const primeiroNome = detalhe.cliente.contato.split(" ")[0] ?? detalhe.cliente.contato;
  const mensagem = link
    ? `Oi, ${primeiroNome}! Aqui é o Yuri, da Fora do Papel. A proposta para a ${detalhe.cliente.empresa} está pronta: ${link}\n\nEla vale até ${p.expires_at ? diaMes(p.expires_at) : ""}. Se tiver qualquer dúvida, me chame por aqui.`
    : "";
  const wpp = linkWhatsapp(detalhe.cliente.whatsapp);

  async function copiar() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      ok("Link copiado.");
    } catch {
      erro("Não foi possível copiar. Selecione o link e copie.");
    }
  }

  return (
    <section
      aria-labelledby="situacao-t"
      className="flex flex-col gap-4 rounded-2xl border border-hub-borda bg-white p-5"
    >
      <div className="flex flex-col gap-2">
        <h2
          id="situacao-t"
          className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-hub-suave"
        >
          Situação
        </h2>
        {p.status === "aceita" && p.accepted_at && (
          <>
            <Selo tom="ok">Aceita em {diaComHora(p.accepted_at)}</Selo>
            {p.aceite && (
              <p className="text-[14px]">
                Por <strong>{p.aceite.nome}</strong> · {p.aceite.razao_social} (
                {p.aceite.documento_tipo.toUpperCase()})
              </p>
            )}
            <p className="text-[14px] text-hub-suave">
              {moeda(p.total_cents)} · a oportunidade foi para "Fechado" no funil.
            </p>
          </>
        )}
        {p.status === "recusada" && (
          <>
            <Selo tom="risco">Recusada{p.refused_at ? ` em ${diaMes(p.refused_at)}` : ""}</Selo>
            <p className="text-[14px] text-hub-suave">
              {p.refused_reason ? `Motivo: ${p.refused_reason}` : "Sem motivo informado."}
            </p>
          </>
        )}
        {p.status === "enviada" && (
          <>
            <Selo tom={vencida ? "risco" : p.viewed_at ? "info" : "neutro"}>
              {vencida
                ? `Venceu em ${p.expires_at ? diaMes(p.expires_at) : ""}`
                : p.viewed_at
                  ? `Aberta pelo cliente em ${diaComHora(p.viewed_at)}`
                  : "Ainda não aberta"}
            </Selo>
            <p className="text-[14px] text-hub-suave">
              Enviada em {p.sent_at ? diaMes(p.sent_at) : "—"} · vale até{" "}
              {p.expires_at ? diaMes(p.expires_at) : "—"} · versão {p.version}
            </p>
          </>
        )}
      </div>

      {link && p.status === "enviada" && (
        <div className="flex flex-col gap-2">
          <label htmlFor="link-proposta" className="text-[14px] font-medium">
            Link para o cliente
          </label>
          <div className="flex gap-2">
            <input
              id="link-proposta"
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="h-11 min-w-0 flex-1 rounded-xl border border-[#DADAD3] bg-hub-fundo px-3 text-[14px]"
            />
            <button
              type="button"
              aria-label="Copiar link"
              className={cn(classeBotaoSecundario, "px-3")}
              onClick={() => void copiar()}
            >
              <Copy className="size-4" aria-hidden="true" />
            </button>
          </div>
          {wpp && (
            <a
              href={`${wpp}?text=${encodeURIComponent(mensagem)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(classeBotaoSecundario, "w-full")}
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              Mandar pelo WhatsApp
            </a>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-hub-borda pt-4">
        <button
          type="button"
          className={cn(classeBotaoSecundario, "w-full")}
          onClick={aoVerComoCliente}
        >
          <Eye className="size-4" aria-hidden="true" />
          Ver como o cliente vê
        </button>
        {(p.status === "enviada" || p.status === "recusada") && (
          <button
            type="button"
            className={cn(classeBotaoSecundario, "w-full")}
            disabled={ocupado}
            onClick={aoReabrir}
          >
            <PencilLine className="size-4" aria-hidden="true" />
            Editar e reenviar
          </button>
        )}
        {p.status === "enviada" && (
          <button
            type="button"
            disabled={ocupado}
            onClick={aoMarcarRecusada}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-medium text-sit-risco-t hover:bg-sit-risco"
          >
            <XCircle className="size-4" aria-hidden="true" />
            Marcar como recusada
          </button>
        )}
      </div>
    </section>
  );
}
