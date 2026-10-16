import { useId, useState } from "react";
import { Check, ExternalLink, RotateCcw } from "lucide-react";

import { Selo } from "@/components/hub/Selo";
import { diaComHora, diaMes } from "@/lib/formatar";
import type { EntregaPortal } from "@/lib/portal";

const botaoEscuro =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-hub-tinta px-5 text-[15px] font-semibold text-white disabled:opacity-50 md:w-auto";
const botaoClaro =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#DADAD3] bg-white px-5 text-[15px] font-semibold disabled:opacity-50 md:w-auto";

/**
 * Uma entrega para aprovar. Aprovar pede confirmação; "Pedir ajuste" pede o que mudar.
 * Nada é aprovado sozinho.
 */
export function EntregaCartao({
  e,
  enviando,
  podeAprovar = true,
  aoAprovar,
  aoPedirAjuste,
}: {
  e: EntregaPortal;
  enviando: boolean;
  podeAprovar?: boolean;
  aoAprovar: (comentario: string) => void;
  aoPedirAjuste: (comentario: string) => void;
}) {
  const [modo, setModo] = useState<"ver" | "aprovar" | "ajuste">("ver");
  const [texto, setTexto] = useState("");
  const idTexto = useId();
  const aberta = e.status === "aguardando";

  return (
    <article
      id={e.id}
      className="flex scroll-mt-24 flex-col gap-4 rounded-2xl border border-hub-borda bg-white p-5 md:p-7"
    >
      <div className="flex flex-wrap items-center gap-2">
        {e.status === "aguardando" ? (
          <Selo tom="atencao">Aguardando você</Selo>
        ) : e.status === "aprovada" ? (
          <Selo tom="ok">Aprovada{e.decidida_em ? ` em ${diaMes(e.decidida_em)}` : ""}</Selo>
        ) : (
          <Selo tom="info">Ajuste pedido{e.decidida_em ? ` em ${diaMes(e.decidida_em)}` : ""}</Selo>
        )}
        <span className="font-rotulo text-[12.5px] uppercase tracking-[0.08em] text-hub-suave">
          Enviada em {diaMes(e.enviada_em)}
          {e.fase ? ` · fase ${e.fase}` : ""}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="font-titulo text-[20px] font-bold leading-snug md:text-[26px]">
          {e.titulo}
        </h2>
        {e.descricao && <p className="text-[15px] text-hub-suave">{e.descricao}</p>}
      </div>
      {e.itens.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="font-rotulo text-[12.5px] font-semibold uppercase tracking-[0.1em] text-hub-suave">
            O que fizemos
          </span>
          <ul className="flex flex-col gap-2">
            {e.itens.map((i) => (
              <li key={i} className="flex gap-2.5 text-[15px]">
                <Check className="mt-0.5 size-4 shrink-0 text-sit-ok-t" aria-hidden="true" />
                {i}
              </li>
            ))}
          </ul>
        </div>
      )}
      {e.previa && (
        <a
          href={e.previa}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 self-start text-[15px] font-semibold underline"
        >
          Abrir a prévia <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      )}
      {e.comentario && !aberta && (
        <p className="rounded-xl bg-hub-fundo p-4 text-[14.5px]">
          Seu comentário: "{e.comentario}"
        </p>
      )}

      {aberta && !podeAprovar && (
        <p className="rounded-xl bg-hub-fundo p-4 text-[14.5px] text-hub-suave">
          Quem aprova na sua empresa decide esta entrega. Seu acesso é só para acompanhar.
        </p>
      )}
      {aberta && podeAprovar && modo === "ver" && (
        <div className="flex flex-col gap-2 md:flex-row">
          <button
            type="button"
            className={botaoEscuro}
            disabled={enviando}
            onClick={() => setModo("aprovar")}
          >
            <Check className="size-4" aria-hidden="true" /> Aprovar
          </button>
          <button
            type="button"
            className={botaoClaro}
            disabled={enviando}
            onClick={() => setModo("ajuste")}
          >
            <RotateCcw className="size-4" aria-hidden="true" /> Pedir ajuste
          </button>
        </div>
      )}
      {aberta && modo !== "ver" && (
        <div className="flex flex-col gap-3 rounded-2xl bg-hub-fundo p-4">
          <p className="text-[15px] font-semibold">
            {modo === "aprovar"
              ? "Confirma a aprovação? Ela fica registrada com o seu nome, a data e a hora."
              : "O que precisa mudar?"}
          </p>
          <label htmlFor={idTexto} className="sr-only">
            {modo === "aprovar" ? "Comentário (opcional)" : "O que precisa mudar"}
          </label>
          <textarea
            id={idTexto}
            rows={3}
            maxLength={1000}
            value={texto}
            onChange={(ev) => setTexto(ev.target.value)}
            placeholder={
              modo === "aprovar"
                ? "Comentário (opcional)"
                : "Conte com detalhes o que você quer diferente"
            }
            className="w-full rounded-xl border border-[#DADAD3] bg-white px-3 py-2.5 text-base outline-none focus:border-hub-tinta"
          />
          <div className="flex flex-col gap-2 md:flex-row">
            <button
              type="button"
              className={botaoEscuro}
              disabled={enviando || (modo === "ajuste" && texto.trim().length < 5)}
              onClick={() => {
                if (modo === "aprovar") aoAprovar(texto.trim());
                else aoPedirAjuste(texto.trim());
                setModo("ver");
                setTexto("");
              }}
            >
              {modo === "aprovar" ? "Sim, aprovar" : "Enviar pedido de ajuste"}
            </button>
            <button type="button" className={botaoClaro} onClick={() => setModo("ver")}>
              Voltar
            </button>
          </div>
        </div>
      )}
      {!aberta && e.decidida_em && (
        <p className="text-[13px] text-hub-suave">Registrado em {diaComHora(e.decidida_em)}.</p>
      )}
    </article>
  );
}
