import { Check, Eye, Send } from "lucide-react";

import type { Rascunho } from "@/components/propostas/tipos";
import { classeAcaoPrincipal, classeBotaoSecundario } from "@/lib/estilos";
import type { Calculo, Conferencias, DocProposta } from "@/lib/propostas";
import { cn } from "@/lib/utils";

const automaticas: { chave: string; texto: string }[] = [
  { chave: "precos", texto: "Preços conferidos em Configurações" },
  { chave: "textos", texto: "Tipo de projeto e título" },
  { chave: "itens", texto: "Todos os itens com nome e horas" },
  { chave: "fora", texto: "O que não está incluído preenchido" },
  { chave: "valor_hora", texto: "Valor por hora acima do piso ou com motivo" },
  { chave: "plano", texto: "Mensalidade escolhida" },
  { chave: "propriedade", texto: "O que fica com o cliente escolhido" },
  // Só aparece com "Código licenciado" (card S10)
  { chave: "licenca", texto: "A licença depende da mensalidade" },
];

/** "Antes de enviar": conferências automáticas (do banco) + 3 do Yuri, e o botão de envio. */
export function AntesDeEnviar({
  c,
  d,
  contato,
  alterar,
  aoEnviar,
  enviando,
  aoVerComoCliente,
}: {
  c: Calculo;
  d: Rascunho;
  contato: string;
  alterar: (parcial: DocProposta) => void;
  aoEnviar: () => void;
  enviando: boolean;
  aoVerComoCliente: () => void;
}) {
  const pendentes = new Set(c.pendencias.map((p) => p.chave));
  const manuais: { chave: keyof Conferencias; texto: string; nota: string }[] = [
    {
      chave: "escopo",
      texto: `Itens conferidos com o que ${contato} pediu`,
      nota: "Releia as anotações da conversa",
    },
    {
      chave: "prazo",
      texto: "Prazo de lançamento conferido",
      nota: "Cabe na agenda dos projetos ativos",
    },
    { chave: "contato", texto: `Dados de ${contato} conferidos`, nota: "Nome, e-mail e WhatsApp" },
  ];
  const visiveis = automaticas.filter(
    (a) => a.chave !== "licenca" || d.propriedade === "licenca" || pendentes.has("licenca"),
  );
  const total = visiveis.length + manuais.length;
  const feitos = Math.max(0, total - c.pendencias.length);
  const primeira = c.pendencias[0];

  return (
    <section
      aria-labelledby="antes-t"
      className="flex flex-col gap-3 rounded-2xl border border-hub-borda bg-white p-5"
    >
      <div className="flex items-baseline justify-between">
        <h2 id="antes-t" className="font-titulo text-[17px] font-bold">
          Antes de enviar
        </h2>
        <span className="text-[13px] font-semibold text-hub-suave tabular-nums">
          {feitos} de {total}
        </span>
      </div>
      <ul className="flex flex-col gap-1">
        {visiveis.map((a) => {
          const okk = !pendentes.has(a.chave);
          return (
            <li key={a.chave} className="flex min-h-9 items-center gap-3 text-[14.5px]">
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-md border",
                  okk ? "border-sit-ok-t bg-sit-ok-t text-white" : "border-[#C9C9C2]",
                )}
              >
                {okk && <Check className="size-3.5" />}
              </span>
              <span className={okk ? "" : "text-hub-suave"}>
                {a.texto}
                <span className="sr-only">{okk ? ": feito" : ": falta"}</span>
              </span>
            </li>
          );
        })}
        {manuais.map((m) => (
          <li key={m.chave}>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 py-1 text-[14.5px]">
              <input
                type="checkbox"
                checked={d.conferencias[m.chave]}
                onChange={(e) =>
                  alterar({ conferencias: { ...d.conferencias, [m.chave]: e.target.checked } })
                }
                className="mt-0.5 size-5 shrink-0 accent-[#145A37]"
              />
              <span className="flex flex-col">
                {m.texto}
                <span className="text-[13px] text-hub-suave">{m.nota}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={cn(
          classeAcaoPrincipal,
          "w-full sm:w-full disabled:cursor-not-allowed disabled:bg-[#ECECE6] disabled:text-hub-suave",
        )}
        disabled={!c.pronto || enviando}
        onClick={aoEnviar}
      >
        <Send className="size-4" aria-hidden="true" />
        {enviando ? "Enviando…" : "Enviar proposta"}
      </button>
      {!c.pronto && primeira && (
        <p className="text-center text-[13.5px] text-hub-suave" role="status">
          Falta{c.pendencias.length > 1 ? `m ${c.pendencias.length} itens` : " 1 item"} para liberar
          o envio. Comece por: {primeira.acao}.
        </p>
      )}
      <button
        type="button"
        className={cn(classeBotaoSecundario, "w-full")}
        onClick={aoVerComoCliente}
      >
        <Eye className="size-4" aria-hidden="true" />
        Ver como o cliente vê
      </button>
    </section>
  );
}
