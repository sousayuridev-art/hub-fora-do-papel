import { Link } from "@tanstack/react-router";
import { BellRing, CalendarX, CircleDollarSign, Play, Undo2, type LucideIcon } from "lucide-react";

import { moeda } from "@/lib/formatar";
import type { ItemFila } from "@/lib/painel";
import { cn } from "@/lib/utils";

const tipos: Record<
  ItemFila["tipo"],
  { icone: LucideIcon; cor: string; texto: (i: ItemFila) => string }
> = {
  pagamento_avisado: {
    icone: BellRing,
    cor: "bg-sit-info text-sit-info-t",
    texto: () => "avisou que pagou: confira no banco e registre",
  },
  cobranca_atrasada: {
    icone: CircleDollarSign,
    cor: "bg-sit-risco text-sit-risco-t",
    texto: (i) =>
      `está com pagamento atrasado${i.dias ? ` há ${i.dias} ${i.dias === 1 ? "dia" : "dias"}` : ""}`,
  },
  adicional_aprovado: {
    icone: Play,
    cor: "bg-sit-ok text-sit-ok-t",
    texto: () => "aprovou um serviço adicional: combine o início",
  },
  parcela_sem_data: {
    icone: CalendarX,
    cor: "bg-sit-atencao text-sit-atencao-t",
    texto: () => "tem parte sem vencimento: defina a data",
  },
  adicional_pago_recusado: {
    icone: Undo2,
    cor: "bg-sit-atencao text-sit-atencao-t",
    texto: () => "teve adicional recusado depois de pagar: combine crédito ou devolução",
  },
};

const classe = "flex min-h-14 items-start gap-3 px-5 py-3.5 hover:bg-hub-fundo";

/** Dinheiro e serviços adicionais que pedem uma ação do Yuri (fila do banco: painel_fila). */
export function PainelFila({ itens }: { itens: ItemFila[] }) {
  if (itens.length === 0) return null;
  return (
    <section aria-labelledby="fila-t" className="flex flex-col gap-3">
      <h2 id="fila-t" className="font-titulo text-xl font-bold">
        Dinheiro e serviços adicionais
      </h2>
      <ol className="flex flex-col rounded-2xl border border-hub-borda bg-white">
        {itens.map((i) => {
          const t = tipos[i.tipo];
          const Icone = t.icone;
          const conteudo = (
            <>
              <span
                className={cn(
                  "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
                  t.cor,
                )}
              >
                <Icone className="size-[18px]" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[15px]">
                  <strong className="font-semibold">{i.empresa}</strong> {t.texto(i)}
                </span>
                <span className="text-[13.5px] text-hub-suave">
                  {i.titulo}
                  {i.valor_cents ? ` · ${moeda(i.valor_cents)}` : ""}
                </span>
              </span>
            </>
          );
          const pedido = i.tipo === "adicional_aprovado" || i.tipo === "adicional_pago_recusado";
          return (
            <li key={`${i.tipo}-${i.id}`} className="border-b border-hub-borda last:border-b-0">
              {pedido ? (
                <Link to="/app/pedidos" search={{ pedido: i.id }} className={classe}>
                  {conteudo}
                </Link>
              ) : (
                <Link to="/app/financeiro" search={{ cobranca: i.id }} className={classe}>
                  {conteudo}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
