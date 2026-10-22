import { useQuery } from "@tanstack/react-query";

import { FaixaNumeros, type ItemNumero } from "@/components/hub/FaixaNumeros";
import { situacaoDe, valorDe } from "@/lib/clientes";
import { chavesFinanceiro, financeiroDoCliente } from "@/lib/financeiro";
import { diaMes, moeda } from "@/lib/formatar";
import type { ClienteLinha, Oportunidade } from "@/lib/funil";

/**
 * Faixa de números da ficha (card RD-1): Etapa, Valor em jogo, Mensalidade e Recebido.
 * O dinheiro vem do resumo financeiro do banco (mesma consulta do cartão Financeiro).
 */
export function ClienteNumeros({ c, o }: { c: ClienteLinha; o: Oportunidade | null }) {
  const f = useQuery({
    queryKey: chavesFinanceiro.cliente(c.id),
    queryFn: () => financeiroDoCliente(c.id),
  });
  const sit = situacaoDe(c);
  const valor = valorDe(c);
  const fin = f.data;
  const carregando = f.isPending ? "…" : "—";

  const itens: ItemNumero[] = [
    {
      rotulo: "Etapa",
      valor: <span className="text-[17px] md:text-[18px]">{sit.texto}</span>,
      apoio: o && !o.archived_at ? `Desde ${diaMes(o.stage_changed_at)}` : undefined,
    },
    {
      rotulo: c.situacao === "cliente" ? "Valor fechado" : "Valor em jogo",
      valor: valor.valor ? moeda(valor.valor) : "—",
      apoio: valor.detalhe ?? undefined,
    },
    {
      rotulo: "Mensalidade",
      valor: fin && fin.mensalidade_cents > 0 ? `${moeda(fin.mensalidade_cents)}/mês` : carregando,
      apoio: fin && fin.mensalidade_cents === 0 ? "Nenhuma ativa" : undefined,
    },
    {
      rotulo: "Recebido",
      valor: fin ? moeda(fin.pago_cents) : carregando,
      apoio: fin
        ? fin.em_atraso_cents > 0
          ? `${moeda(fin.em_atraso_cents)} em atraso`
          : fin.a_receber_cents > 0
            ? `${moeda(fin.a_receber_cents)} a receber`
            : undefined
        : f.isError
          ? "Não foi possível carregar"
          : undefined,
      tom: fin && fin.em_atraso_cents > 0 ? "risco" : undefined,
    },
  ];
  return <FaixaNumeros itens={itens} />;
}
