import { useId, useState } from "react";

import { Selo } from "@/components/hub/Selo";
import { diaComHora, moeda } from "@/lib/formatar";
import type { AdicionalPortal } from "@/lib/portal";

const botaoEscuro =
  "inline-flex h-12 w-full items-center justify-center rounded-xl bg-hub-tinta px-5 text-[15px] font-semibold text-white disabled:opacity-50";
const botaoClaro =
  "inline-flex h-12 w-full items-center justify-center rounded-xl border border-[#DADAD3] bg-white px-5 text-[15px] font-semibold text-hub-tinta disabled:opacity-50";

/**
 * Serviço adicional para decidir (card CX-7, no molde da proposta): o que entra, horas × valor da
 * hora e o total, numa caixa escura de decisão.
 * Só começa com o sim do cliente. Os dois botões têm a mesma largura (card P).
 */
export function AdicionalCartao({
  a,
  enviando,
  podeAprovar = true,
  aoDecidir,
}: {
  a: AdicionalPortal;
  enviando: boolean;
  podeAprovar?: boolean;
  aoDecidir: (aprova: boolean, comentario: string) => void;
}) {
  const [confirmar, setConfirmar] = useState<null | boolean>(null);
  const [texto, setTexto] = useState("");
  const idTexto = useId();
  const aberto = a.status === "aguardando_cliente";

  return (
    <article
      id={a.id}
      className="grid scroll-mt-24 gap-5 rounded-2xl border border-hub-borda bg-white p-5 md:grid-cols-[minmax(0,1fr)_320px] md:p-7"
    >
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Selo tom="info">Serviço adicional</Selo>
          <span className="font-rotulo text-[13.5px] font-medium text-hub-suave">
            Pedido {a.codigo}
          </span>
        </div>
        <h2 className="font-marca text-[22px] font-extrabold leading-tight tracking-[-0.02em] md:text-[30px]">
          {a.titulo}
        </h2>
        {a.descricao && <p className="text-[15px] text-hub-suave">{a.descricao}</p>}
        {a.nota && <p className="rounded-xl bg-hub-fundo p-4 text-[15px]">{a.nota}</p>}
        {aberto && (
          <p className="text-[14px] text-hub-suave">
            Este pedido vai além do que combinamos na proposta. Ele só começa se você aprovar.
          </p>
        )}
      </div>

      <div className="capa-escura flex flex-col gap-4 rounded-2xl p-5 md:p-6">
        <div className="flex flex-col gap-1">
          <span className="font-rotulo text-[13.5px] font-medium text-[#C9CBD0]">Valor</span>
          <strong className="font-marca text-[36px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
            {moeda(a.valor_cents)}
          </strong>
          <span className="text-[14px] text-[#C9CBD0]">
            {a.horas?.toLocaleString("pt-BR")} h × {moeda(a.hora_cents)} a hora
          </span>
        </div>

        {aberto && !podeAprovar ? (
          <p className="text-[14.5px] text-[#C9CBD0]">
            Quem aprova na sua empresa decide este serviço. Seu acesso é só para acompanhar.
          </p>
        ) : aberto ? (
          confirmar === null ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className={`${botaoClaro} border-transparent bg-[#FFB020]`}
                disabled={enviando}
                onClick={() => setConfirmar(true)}
              >
                Aprovar
              </button>
              <button
                type="button"
                className={`${botaoEscuro} border border-white/20 bg-transparent`}
                disabled={enviando}
                onClick={() => setConfirmar(false)}
              >
                Agora não
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-[15px] font-semibold">
                {confirmar
                  ? `Confirma o serviço adicional de ${moeda(a.valor_cents)}?`
                  : "Confirma que não quer este serviço agora?"}
              </p>
              <label htmlFor={idTexto} className="sr-only">
                Comentário (opcional)
              </label>
              <textarea
                id={idTexto}
                rows={2}
                maxLength={1000}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Comentário (opcional)"
                className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-base text-white outline-none placeholder:text-[#9A9DA3] focus:border-white"
              />
              <button
                type="button"
                className={`${botaoClaro} border-transparent bg-[#FFB020]`}
                disabled={enviando}
                onClick={() => {
                  aoDecidir(confirmar, texto.trim());
                  setConfirmar(null);
                  setTexto("");
                }}
              >
                {confirmar ? "Sim, aprovar" : "Sim, não fazer agora"}
              </button>
              <button
                type="button"
                className={`${botaoEscuro} border border-white/20 bg-transparent`}
                onClick={() => setConfirmar(null)}
              >
                Voltar
              </button>
            </div>
          )
        ) : (
          <p className="text-[14.5px]">
            {a.decisao === "aprovado" ? "Você aprovou" : "Você preferiu não fazer agora"}
            {a.decidido_em ? ` em ${diaComHora(a.decidido_em)}` : ""}.
          </p>
        )}
      </div>
    </article>
  );
}
