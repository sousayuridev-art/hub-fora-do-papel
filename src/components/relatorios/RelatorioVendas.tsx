import { BlocoRelatorio } from "@/components/relatorios/BlocoRelatorio";
import type { MotivoPerda, Origem } from "@/lib/funil";
import { moeda } from "@/lib/formatar";
import {
  plural,
  rotuloEtapaRelatorio,
  rotuloOrigemRelatorio,
  rotuloPerda,
  type Relatorio,
  type Variacao,
} from "@/lib/relatorios";
import { cn } from "@/lib/utils";

/** Linha de barra horizontal: nome, barra proporcional e valor à direita. */
function LinhaBarra({
  nome,
  pct,
  valor,
  apoio,
  destaque = false,
  trilho = true,
}: {
  nome: string;
  pct: number;
  valor: string;
  apoio?: string | undefined;
  destaque?: boolean;
  trilho?: boolean;
}) {
  return (
    <li className="grid grid-cols-[100px_minmax(0,1fr)_minmax(96px,auto)] items-center gap-3 text-[14px] md:grid-cols-[112px_minmax(0,1fr)_minmax(120px,auto)]">
      {/* Quebra depois da barra ("Instagram/ Facebook"), nunca no meio da palavra */}
      <span className="leading-tight">{nome.replaceAll("/", "/\u200b")}</span>
      <span
        aria-hidden="true"
        className={cn("relative h-[22px] rounded-r-[4px]", trilho && "bg-[#EDEDE7]")}
      >
        <span
          className="absolute inset-y-0 left-0 rounded-r-[4px] bg-serie-1"
          style={{ width: `${Math.max(pct > 0 ? 1.5 : 0, Math.min(100, pct))}%` }}
        />
      </span>
      <span className="flex items-baseline justify-between gap-2">
        <b className="font-semibold tabular-nums">{valor}</b>
        {apoio && (
          <span
            className={cn(
              "text-[12.5px] tabular-nums",
              destaque ? "font-semibold text-sit-risco-t" : "text-hub-suave",
            )}
          >
            {apoio}
          </span>
        )}
      </span>
    </li>
  );
}

/** Vendas (card RD-8): funil em barras e valor fechado por origem; detalhes e motivos de perda. */
export function RelatorioVendas({
  v,
  contatos,
  rotuloAnterior,
}: {
  v: Relatorio["vendas"];
  /** Variação de contatos novos contra o período anterior (relatorios_resumo). */
  contatos: Variacao | undefined;
  rotuloAnterior: string;
}) {
  const topo = v.funil[0]?.chegaram ?? 0;
  const maiorPerda = v.funil.find((e) => e.etapa === v.maior_perda) ?? null;
  const maiorMotivo = v.perdas[0]?.quantidade ?? 1;
  const maiorOrigem = Math.max(1, ...v.por_origem.map((o) => o.receita_cents));
  const comparacao =
    contatos && contatos.anterior > 0 && contatos.diferenca !== 0
      ? ` (${Math.abs(contatos.diferenca)} a ${contatos.diferenca > 0 ? "mais" : "menos"} que no ${rotuloAnterior})`
      : "";

  return (
    <BlocoRelatorio
      id="vendas"
      titulo="Vendas"
      resumo={
        v.contatos === 0
          ? "Nenhum contato chegou neste período."
          : `${plural(v.contatos, "contato chegou", "contatos chegaram")} no período${comparacao}.${
              maiorPerda
                ? ` A maior perda está na passagem para ${rotuloEtapaRelatorio[maiorPerda.etapa]?.toLowerCase()}: ${maiorPerda.passaram_pct}% seguiram.`
                : ""
            }${v.dias_ate_aceite !== null ? ` Do primeiro contato ao aceite: ${plural(v.dias_ate_aceite, "dia", "dias")} em média.` : ""}`
      }
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <h3 className="text-[15px] font-semibold">Funil do período</h3>
          <ul className="flex flex-col gap-2.5" aria-label="Quantos chegaram em cada etapa">
            {v.funil.map((e) => (
              <LinhaBarra
                key={e.etapa}
                nome={rotuloEtapaRelatorio[e.etapa] ?? e.etapa}
                pct={topo > 0 ? (e.chegaram / topo) * 100 : 0}
                valor={String(e.chegaram)}
                apoio={e.passaram_pct === null ? undefined : `${e.passaram_pct}% seguiram`}
                destaque={maiorPerda?.etapa === e.etapa}
              />
            ))}
          </ul>
          <p className="text-[13px] text-hub-suave">
            No funil hoje:{" "}
            {v.funil
              .map((e) => `${rotuloEtapaRelatorio[e.etapa] ?? e.etapa} ${e.hoje}`)
              .join(" · ")}
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <h3 className="text-[15px] font-semibold">Valor fechado por origem</h3>
          {v.por_origem.length === 0 ? (
            <p className="text-[14px] text-hub-suave">Sem contatos no período.</p>
          ) : (
            <ul className="flex flex-col gap-2.5" aria-label="Valor fechado por origem do contato">
              {v.por_origem.map((o) => (
                <LinhaBarra
                  key={o.origem}
                  nome={rotuloOrigemRelatorio[o.origem as Origem] ?? o.origem}
                  pct={(o.receita_cents / maiorOrigem) * 100}
                  valor={moeda(o.receita_cents)}
                  apoio={plural(o.contatos, "contato", "contatos")}
                  trilho={false}
                />
              ))}
            </ul>
          )}
          {v.anuncios_cents > 0 && (
            <p className="text-[13px] text-[#2A2D33]">
              Anúncios: {moeda(v.anuncios_cents)} investidos no período
              {v.diagnosticos_por_anuncio > 0
                ? `; cada diagnóstico pago vindo de anúncio custou ${moeda(Math.round(v.anuncios_cents / v.diagnosticos_por_anuncio))}.`
                : "; nenhum diagnóstico pago veio de anúncio ainda."}
            </p>
          )}
        </div>
      </div>

      {v.por_origem.length > 0 && (
        <details className="group rounded-xl border border-hub-borda print:border-0">
          <summary className="flex min-h-11 cursor-pointer items-center px-4 text-[14px] font-medium print:hidden">
            Ver os números por origem
          </summary>
          <div className="overflow-x-auto px-4 pb-3 print:px-0">
            <table className="w-full min-w-[520px] border-collapse text-[14px]">
              <caption className="sr-only">Resultado por origem do contato</caption>
              <thead>
                <tr className="text-left text-[13px] text-hub-suave">
                  <th scope="col" className="py-2 pr-2 font-medium">
                    Origem
                  </th>
                  <th scope="col" className="py-2 pr-2 text-right font-medium">
                    Contatos
                  </th>
                  <th scope="col" className="py-2 pr-2 text-right font-medium">
                    Diagnósticos pagos
                  </th>
                  <th scope="col" className="py-2 pr-2 text-right font-medium">
                    Fechados
                  </th>
                  <th scope="col" className="py-2 pr-2 text-right font-medium">
                    Conversão
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    Receita
                  </th>
                </tr>
              </thead>
              <tbody>
                {v.por_origem.map((o) => (
                  <tr key={o.origem} className="border-t border-hub-borda">
                    <th scope="row" className="py-2.5 pr-2 text-left font-medium">
                      {rotuloOrigemRelatorio[o.origem as Origem] ?? o.origem}
                    </th>
                    <td className="py-2.5 pr-2 text-right tabular-nums">{o.contatos}</td>
                    <td className="py-2.5 pr-2 text-right tabular-nums">{o.diagnosticos}</td>
                    <td className="py-2.5 pr-2 text-right tabular-nums">{o.fechados}</td>
                    <td className="py-2.5 pr-2 text-right tabular-nums">
                      {o.conversao_pct === null
                        ? "—"
                        : `${o.conversao_pct.toLocaleString("pt-BR")}%`}
                    </td>
                    <td className="py-2.5 text-right font-semibold tabular-nums">
                      {moeda(o.receita_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-[15px] font-semibold">Motivos de perda</h3>
        {v.perdas.length === 0 ? (
          <p className="text-[14px] text-hub-suave">
            Nenhum contato arquivado no período. Todo arquivamento pede um motivo, e ele aparece
            aqui.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {v.perdas.map((p) => (
              <li
                key={p.motivo}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 text-[14px] sm:grid-cols-[200px_minmax(0,1fr)_auto]"
              >
                <span>{rotuloPerda[p.motivo as MotivoPerda] ?? p.motivo}</span>
                <span
                  aria-hidden="true"
                  className="col-span-2 row-start-2 block h-2 rounded-full bg-[#E6E6E0] sm:col-span-1 sm:row-start-auto"
                >
                  <span
                    className="block h-full rounded-full bg-[#9A1C12]"
                    style={{ width: `${(p.quantidade / maiorMotivo) * 100}%` }}
                  />
                </span>
                <span className="font-semibold tabular-nums">{p.quantidade}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </BlocoRelatorio>
  );
}
