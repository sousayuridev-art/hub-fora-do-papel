import { GraficoBarras, GraficoLinha, Legenda } from "@/components/hub/Graficos";
import { Ajuda } from "@/components/trafego/Ajuda";
import { Cartao } from "@/components/trafego/Cartao";
import { moeda } from "@/lib/formatar";
import { rotuloPlataforma, type TendenciaTrafego } from "@/lib/trafego";

const META = "var(--color-serie-1)";
const GOOGLE = "var(--color-serie-2)";

/** Rótulo da semana: dia em que começa (segunda, "14/9") ou "Esta" para a semana corrente. */
const rotuloSemana = (inicio: string, ultima: boolean) => {
  if (ultima) return "Esta";
  const [, m, d] = inicio.split("-");
  return `${Number(d)}/${Number(m)}`;
};
/** Eixo sem "R$" para caber no celular (o título já diz que é dinheiro). */
const eixo = (cents: number) => Math.round(cents / 100).toLocaleString("pt-BR");

function Carregando() {
  return <div className="h-[236px] animate-pulse rounded-xl bg-hub-fundo" aria-busy="true" />;
}

function Indisponivel() {
  return (
    <p className="m-0 rounded-xl border border-dashed border-[#D6D6CF] p-4 text-[14px] text-hub-suave">
      Não foi possível carregar as semanas. Recarregue a página para tentar de novo.
    </p>
  );
}

/** Investimento por semana (8 semanas, Meta e Google empilhados, contatos embaixo). */
function InvestimentoSemanal({ t, falhou }: { t: TendenciaTrafego | undefined; falhou: boolean }) {
  const s = t?.semanas ?? [];
  const vazio = s.every((w) => w.meta_cents + w.google_cents === 0 && w.contatos === 0);
  return (
    <Cartao
      id="semanas"
      titulo="Investimento por semana"
      acao={
        <Legenda
          series={[
            { nome: rotuloPlataforma.meta, cor: META },
            { nome: "Google", cor: GOOGLE },
          ]}
        />
      }
    >
      {!t ? (
        falhou ? (
          <Indisponivel />
        ) : (
          <Carregando />
        )
      ) : vazio ? (
        <p className="m-0 rounded-xl border border-dashed border-[#D6D6CF] p-4 text-[14px] text-hub-suave">
          Nenhum investimento nem contato de anúncio nas últimas 8 semanas.
        </p>
      ) : (
        <GraficoBarras
          rotulo="Investimento por semana, por plataforma, nas últimas 8 semanas"
          categorias={s.map((w, k) => rotuloSemana(w.inicio, k === s.length - 1))}
          series={[
            { nome: rotuloPlataforma.meta, cor: META, valores: s.map((w) => w.meta_cents) },
            { nome: "Google", cor: GOOGLE, valores: s.map((w) => w.google_cents) },
          ]}
          empilhado
          formatar={moeda}
          formatarEixo={eixo}
          altura={180}
          rodape={(k) => (
            <b
              className="font-semibold tabular-nums text-hub-tinta"
              aria-label={`${s[k]?.contatos ?? 0} contatos`}
            >
              {s[k]?.contatos ?? 0}
            </b>
          )}
        />
      )}
    </Cartao>
  );
}

/** Custo por contato semana a semana; linha de limite só se houver limite configurado. */
function CustoSemanal({ t, falhou }: { t: TendenciaTrafego | undefined; falhou: boolean }) {
  const s = t?.semanas ?? [];
  const pontos = s.flatMap((w, k) =>
    w.custo_contato_cents == null
      ? []
      : [{ rotulo: rotuloSemana(w.inicio, k === s.length - 1), valor: w.custo_contato_cents }],
  );
  const ultima = s[s.length - 1];
  const limite = t?.limite_custo_contato_cents ?? null;
  return (
    <Cartao
      id="custo-semana"
      className="max-md:hidden"
      titulo={
        <>
          Custo por contato
          <Ajuda sobre="custo por contato por semana">
            Investido na semana dividido pelos contatos de anúncio que chegaram na mesma semana.
            Semanas sem contato ficam fora da linha.
          </Ajuda>
        </>
      }
      apoio={
        limite != null ? `8 semanas · linha tracejada = limite de ${moeda(limite)}` : "8 semanas"
      }
    >
      {!t ? (
        falhou ? (
          <Indisponivel />
        ) : (
          <Carregando />
        )
      ) : (
        <>
          <p className="m-0 flex items-baseline gap-2">
            <b className="text-[26px] font-semibold tabular-nums leading-none">
              {moeda(ultima?.custo_contato_cents)}
            </b>
            <span className="text-[13px] text-hub-suave">esta semana</span>
          </p>
          {pontos.length === 0 ? (
            <p className="m-0 rounded-xl border border-dashed border-[#D6D6CF] p-4 text-[14px] text-hub-suave">
              Aparece quando uma semana tiver investimento e contato de anúncio.
            </p>
          ) : (
            <GraficoLinha
              rotulo="Custo por contato por semana"
              pontos={pontos}
              formatar={moeda}
              {...(limite != null
                ? { referencia: { valor: limite, rotulo: `limite ${moeda(limite)}` } }
                : {})}
            />
          )}
        </>
      )}
    </Cartao>
  );
}

/** Gráficos do tráfego (RD-6): dados da RPC trafego_tendencia, sempre as últimas 8 semanas. */
export function TrafegoGraficos({
  t,
  falhou,
}: {
  t: TendenciaTrafego | undefined;
  falhou: boolean;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <InvestimentoSemanal t={t} falhou={falhou} />
      <CustoSemanal t={t} falhou={falhou} />
    </div>
  );
}
