import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";

import { CampoEscolha } from "@/components/hub/Campo";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { FaixaNumeros } from "@/components/hub/FaixaNumeros";
import { DestaquesResultados } from "@/components/marketing/DestaquesResultados";
import { TabelaResultados } from "@/components/marketing/TabelaResultados";
import { useAvisoDeErro } from "@/components/marketing/useAvisoDeErro";
import { moeda } from "@/lib/formatar";
import {
  chavesMarketing,
  destaquesConteudo,
  intervaloDoPeriodo,
  resultadosConteudo,
  rotuloAgrupar,
  type Agrupar,
} from "@/lib/marketing";

const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Os 6 meses até o atual, para escolher no período. */
function ultimosMeses(hoje: string): { id: string; rotulo: string }[] {
  const [a, m] = hoje.split("-").map(Number) as [number, number];
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(a, m - 1 - i, 1));
    const id = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    return { id, rotulo: `${meses[d.getUTCMonth()]}/${d.getUTCFullYear()}` };
  });
}

/**
 * Aba Resultados da Central (MK-4): o que trouxe resultado por pilar, canal, objetivo, formato ou
 * campanha. Somas, médias e destaques vêm prontos do banco.
 */
export function ResultadosConteudo({
  periodo,
  agrupar,
  hoje,
  aoMudar,
  aoAbrir,
}: {
  periodo: string;
  agrupar: Agrupar;
  hoje: string;
  aoMudar: (p: { periodo?: string | undefined; agrupar?: Agrupar | undefined }) => void;
  aoAbrir: (pecaId: string) => void;
}) {
  const { inicio, fim } = intervaloDoPeriodo(periodo, hoje);
  const res = useQuery({
    queryKey: chavesMarketing.resultados(inicio, fim, agrupar),
    queryFn: () => resultadosConteudo(inicio, fim, agrupar),
    placeholderData: keepPreviousData,
  });
  const dest = useQuery({
    queryKey: chavesMarketing.destaques(inicio, fim),
    queryFn: () => destaquesConteudo(inicio, fim),
  });
  useAvisoDeErro(dest.isError, "Não conseguimos carregar os destaques.", dest.refetch);
  const t = res.data?.totais;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
        <CampoEscolha<string>
          rotulo="Período"
          valor={periodo}
          aoMudar={(p) => aoMudar({ periodo: p === "30" ? undefined : p })}
          opcoes={[
            { id: "30", rotulo: "Últimos 30 dias" },
            { id: "90", rotulo: "Últimos 90 dias" },
            ...ultimosMeses(hoje),
          ]}
        />
        <CampoEscolha<Agrupar>
          rotulo="Agrupar por"
          valor={agrupar}
          aoMudar={(a) => aoMudar({ agrupar: a === "pilar" ? undefined : a })}
          opcoes={(Object.keys(rotuloAgrupar) as Agrupar[]).map((a) => ({
            id: a,
            rotulo: rotuloAgrupar[a],
          }))}
        />
      </div>

      {res.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar os resultados"
          aoTentarDeNovo={() => void res.refetch()}
        />
      ) : !res.data || !t ? (
        <div className="h-72 animate-pulse rounded-2xl bg-white" aria-busy="true" />
      ) : (
        <>
          <FaixaNumeros
            itens={[
              {
                rotulo: "Versões publicadas",
                valor: t.versoes.toLocaleString("pt-BR"),
                apoio: t.com_resultado < t.versoes ? `${t.com_resultado} com números` : undefined,
              },
              { rotulo: "Alcance", valor: t.alcance.toLocaleString("pt-BR") },
              {
                rotulo: "Salvamentos",
                valor: t.salvamentos.toLocaleString("pt-BR"),
                apoio:
                  t.salvamentos_por_mil !== null
                    ? `${t.salvamentos_por_mil.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} por mil`
                    : undefined,
              },
              { rotulo: "Contatos", valor: t.contatos.toLocaleString("pt-BR") },
              {
                rotulo: "Negócios fechados",
                valor: t.negocios_fechados.toLocaleString("pt-BR"),
                apoio: t.valor_fechado > 0 ? moeda(t.valor_fechado) : undefined,
                tom: t.negocios_fechados > 0 ? "ok" : undefined,
              },
            ]}
          />
          <p className="flex items-start gap-2 text-[13px] text-hub-suave">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Números registrados à mão em cada versão. Contato conta na peça marcada como origem na
            ficha do cliente (automática pelo link com rastreio).
          </p>
          {res.data.grupos.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
              Nenhuma versão publicada nesse período.
            </p>
          ) : (
            <TabelaResultados agrupar={res.data.agrupar} linhas={res.data.grupos} />
          )}
        </>
      )}

      {dest.data && <DestaquesResultados d={dest.data} aoAbrir={aoAbrir} />}
    </div>
  );
}
