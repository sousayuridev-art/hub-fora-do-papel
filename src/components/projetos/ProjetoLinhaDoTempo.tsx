import { diaComHora, moeda } from "@/lib/formatar";
import type { EventoProjeto } from "@/lib/projetos";
import { rotuloClassificacao, type Classificacao } from "@/lib/pedidos";
import { cn } from "@/lib/utils";

const texto = (e: EventoProjeto): string => {
  const d = e.detalhe;
  const s = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : "");
  switch (e.tipo) {
    case "projeto_criado":
      return d["proposta_id"] ? "Projeto criado no aceite da proposta" : "Projeto criado";
    case "projeto_atualizado":
      return "Dados do projeto atualizados";
    case "projeto_lancado":
      return "Projeto lançado";
    case "fase_concluida":
      return `Fase ${s("fase")} concluída`;
    case "aprovacao_enviada":
      return `Enviado para aprovação: ${s("titulo")}`;
    case "aprovacao_cancelada":
      return `Pedido de aprovação cancelado: ${s("titulo")}`;
    case "aprovacao_aprovada":
      return `Cliente aprovou: ${s("titulo")}`;
    case "aprovacao_ajuste":
      return `Cliente pediu ajuste em ${s("titulo")}: "${s("comentario")}"`;
    case "pendencia_criada":
      return `Pendência para o cliente: ${s("titulo")}`;
    case "pendencia_feita":
      return `Pendência feita: ${s("titulo")}`;
    case "pendencia_reaberta":
      return `Pendência reaberta: ${s("titulo")}`;
    case "pendencia_removida":
      return `Pendência removida: ${s("titulo")}`;
    case "pedido_recebido":
      return `Pedido ${s("codigo")}: ${s("titulo")}`;
    case "pedido_classificado":
      return `Pedido ${s("codigo")} classificado como ${
        rotuloClassificacao[s("classificacao") as Classificacao]?.toLowerCase() ??
        s("classificacao")
      }`;
    case "adicional_enviado":
      return `Serviço adicional ${s("codigo")} enviado ao cliente (${moeda(Number(d["valor_cents"] ?? 0))})`;
    case "adicional_aprovado":
      return `Cliente aprovou o serviço adicional ${s("codigo")}`;
    case "adicional_recusado":
      return `Cliente recusou o serviço adicional ${s("codigo")}`;
    case "pedido_iniciado":
      return `Pedido ${s("codigo")} em andamento`;
    case "pedido_pronto":
      return `Pedido ${s("codigo")} pronto`;
    case "pedido_recusado":
      return `Pedido ${s("codigo")} recusado: ${s("motivo")}`;
    default:
      return e.tipo.replace(/_/g, " ");
  }
};

/** Tudo o que aconteceu no projeto, do mais novo para o mais antigo (últimos 100). */
export function ProjetoLinhaDoTempo({ itens }: { itens: EventoProjeto[] }) {
  if (itens.length === 0)
    return (
      <p className="rounded-2xl border border-hub-borda bg-white p-5 text-hub-suave">
        Nada registrado ainda.
      </p>
    );
  return (
    <ol className="flex flex-col rounded-2xl border border-hub-borda bg-white">
      {itens.map((e, i) => (
        <li
          key={`${e.quando}-${i}`}
          className="flex gap-3 border-b border-hub-borda px-5 py-3.5 last:border-b-0"
        >
          <span
            aria-hidden="true"
            className={cn(
              "mt-2 size-2 shrink-0 rounded-full",
              e.origem === "cliente" ? "bg-[#FFB020]" : "bg-[#9A9DA3]",
            )}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-[14.5px]">{texto(e)}</span>
            <span className="text-[13px] text-hub-suave">
              {diaComHora(e.quando)} ·{" "}
              {e.origem === "cliente" ? "pelo cliente, no portal" : "no Hub"}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
