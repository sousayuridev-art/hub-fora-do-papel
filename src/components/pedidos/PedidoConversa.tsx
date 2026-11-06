import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";

import { diaComHora } from "@/lib/formatar";
import { erro, mensagemDeErro } from "@/lib/notify";
import type { PedidoLinha } from "@/lib/pedidos";
import {
  chavesPedidoSistema,
  conversaDoPedido,
  mensagemDoPedidoSistema,
  printsDoPedido,
  responderPedido,
  rotuloPrioridadePedido,
  rotuloTipoPedido,
  type MensagemPedido,
} from "@/lib/pedidosSistema";
import { cn } from "@/lib/utils";

/**
 * Pedido que veio de um sistema (SIS-2): quem pediu, tipo e prioridade, prints e a conversa com a
 * equipe do cliente. A resposta do Yuri aparece no sistema do cliente, na tela de Solicitações.
 */
export function PedidoConversa({ p }: { p: PedidoLinha }) {
  const qc = useQueryClient();
  const chave = chavesPedidoSistema.conversa(p.id);
  const conversa = useQuery({ queryKey: chave, queryFn: () => conversaDoPedido(p.id) });
  const prints = useQuery({
    queryKey: chavesPedidoSistema.prints(p.id),
    queryFn: () => printsDoPedido(p.id),
    enabled: (p.prints ?? 0) > 0,
    staleTime: 5 * 60_000,
  });
  const [texto, setTexto] = useState("");

  const enviar = useMutation({
    mutationFn: (t: string) => responderPedido(p.id, t),
    onMutate: async (t) => {
      await qc.cancelQueries({ queryKey: chave });
      const antes = qc.getQueryData<MensagemPedido[]>(chave);
      qc.setQueryData<MensagemPedido[]>(chave, [
        ...(antes ?? []),
        {
          id: `temp-${Date.now()}`,
          autor: "equipe",
          autor_nome: "Você",
          texto: t,
          created_at: new Date().toISOString(),
          enviando: true,
        },
      ]);
      setTexto("");
      return { antes, t };
    },
    onError: (e, t, ctx) => {
      if (ctx) qc.setQueryData(chave, ctx.antes);
      setTexto(t);
      erro(mensagemDoPedidoSistema(e) ?? mensagemDeErro(e), {
        tentarDeNovo: () => enviar.mutate(t),
      });
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: chave }),
  });

  function aoEnviar(e: FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (t && !enviar.isPending) enviar.mutate(t);
  }

  const doSistema = p.origin === "sistema";
  // Revisão do site (RS-1): a resposta aparece no portal do cliente, no ajuste
  const daRevisao = p.origin === "revisao";
  const comCliente = doSistema || daRevisao;
  const detalhes = [
    p.solicitante?.nome ? `Pedido por ${p.solicitante.nome}` : null,
    p.tipo ? rotuloTipoPedido[p.tipo] : null,
    p.prioridade ? `Prioridade ${rotuloPrioridadePedido[p.prioridade].toLowerCase()}` : null,
  ].filter(Boolean);
  const mensagens = conversa.data ?? [];

  return (
    <section aria-labelledby={`conversa-${p.id}`} className="flex flex-col gap-3">
      {doSistema && detalhes.length > 0 && (
        <p className="text-[14px] text-hub-suave">{detalhes.join(" · ")}</p>
      )}

      {(p.prints ?? 0) > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-[14px] font-semibold">Prints</h3>
          {prints.isError ? (
            <p className="text-[13.5px] text-sit-risco-t">Não foi possível carregar os prints.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {(prints.data ?? Array.from({ length: p.prints ?? 0 }, () => null)).map((x, i) => (
                <li key={x?.id ?? i}>
                  {x?.url ? (
                    <a
                      href={x.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="block overflow-hidden rounded-xl border border-hub-borda bg-hub-fundo"
                    >
                      <img
                        src={x.url}
                        alt={`Print ${i + 1} do pedido`}
                        className="aspect-square w-full object-cover"
                      />
                    </a>
                  ) : (
                    <div className="aspect-square animate-pulse rounded-xl bg-hub-fundo" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <h3 id={`conversa-${p.id}`} className="text-[14px] font-semibold">
        Conversa{comCliente ? " com a equipe do cliente" : ""}
      </h3>
      {conversa.isError ? (
        <p className="text-[13.5px] text-sit-risco-t">Não foi possível carregar a conversa.</p>
      ) : conversa.isPending ? (
        <div className="h-14 animate-pulse rounded-xl bg-hub-fundo" aria-busy="true" />
      ) : mensagens.length === 0 ? (
        <p className="text-[13.5px] text-hub-suave">
          {doSistema
            ? "Ninguém escreveu ainda. A sua resposta aparece no sistema do cliente."
            : daRevisao
              ? "Ninguém escreveu ainda. A sua resposta aparece no portal, junto do ajuste."
              : "Sem conversa neste pedido."}
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {mensagens.map((m) => (
            <li
              key={m.id}
              className={cn(
                "flex max-w-[90%] flex-col gap-0.5 rounded-2xl px-3.5 py-2.5 text-[14.5px]",
                m.autor === "equipe"
                  ? "self-end bg-hub-tinta text-white"
                  : "self-start bg-hub-fundo text-hub-tinta",
                m.enviando && "opacity-70",
              )}
            >
              <span
                className={cn(
                  "text-[12.5px]",
                  m.autor === "equipe" ? "text-white/70" : "text-hub-suave",
                )}
              >
                {m.autor_nome} · {m.enviando ? "enviando…" : diaComHora(m.created_at)}
              </span>
              <span className="whitespace-pre-line break-words">{m.texto}</span>
            </li>
          ))}
        </ol>
      )}

      {comCliente && (
        <form onSubmit={aoEnviar} className="flex items-end gap-2">
          <label htmlFor={`resposta-${p.id}`} className="sr-only">
            Responder à equipe do cliente
          </label>
          <textarea
            id={`resposta-${p.id}`}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Responder à equipe do cliente"
            className="min-h-11 min-w-0 flex-1 resize-y rounded-xl border border-[#DADAD3] bg-white px-3 py-2.5 text-base outline-none focus:border-hub-tinta md:text-[15px]"
          />
          <button
            type="submit"
            disabled={!texto.trim() || enviar.isPending}
            aria-label="Enviar resposta"
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#FFB020] text-hub-tinta disabled:opacity-40"
          >
            <Send className="size-4" aria-hidden="true" />
          </button>
        </form>
      )}
    </section>
  );
}
