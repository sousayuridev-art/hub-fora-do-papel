import { FaixaNumeros } from "@/components/hub/FaixaNumeros";
import { dataLocal, diaMes } from "@/lib/formatar";
import { horasMin, type ListaProjetos } from "@/lib/projetos";

/**
 * Faixa de números da lista de projetos (RD-2), sempre sobre os projetos em andamento.
 * As contas por projeto (saúde, pendências, horas) vêm do banco; aqui só se somam poucos projetos.
 */
export function ProjetosNumeros({
  andamento,
  aoVerAndamento,
}: {
  andamento: ListaProjetos | undefined;
  aoVerAndamento: () => void;
}) {
  const ps = andamento?.projetos ?? [];
  const atencao = ps.filter((p) => p.saude.nivel !== "ok").length;
  const comCliente = ps.reduce((s, p) => s + p.aguardando_cliente, 0);
  const atrasadas = ps.reduce((s, p) => s + p.pendencias_atrasadas, 0);
  const prox = andamento?.proximo_lancamento ?? null;
  const semana = andamento?.semana;
  const carregando = !andamento;
  return (
    <FaixaNumeros
      itens={[
        {
          rotulo: "Em andamento",
          valor: carregando ? "–" : andamento.contagem.andamento,
          apoio: carregando
            ? " "
            : atencao === 0
              ? "Todos no ritmo"
              : `${atencao} ${atencao === 1 ? "pede" : "pedem"} atenção`,
          tom: atencao > 0 ? "atencao" : undefined,
          aoClicar: aoVerAndamento,
        },
        {
          rotulo: "Com o cliente",
          valor: carregando ? "–" : comCliente,
          apoio:
            atrasadas > 0
              ? `${atrasadas} ${atrasadas === 1 ? "pendência atrasada" : "pendências atrasadas"}`
              : "aprovações e pendências abertas",
          tom: atrasadas > 0 ? "risco" : undefined,
        },
        {
          rotulo: "Próximo lançamento",
          valor: prox ? diaMes(dataLocal(prox.data)) : "Sem data",
          apoio: prox ? prox.nome : "Nenhum projeto com data marcada",
        },
        {
          rotulo: "Horas desta semana",
          valor: semana ? horasMin(semana.total_minutos) : "–",
          apoio: semana
            ? `seg ${diaMes(dataLocal(semana.inicio))} a dom ${diaMes(dataLocal(semana.fim))}`
            : " ",
        },
      ]}
    />
  );
}
