import { BlocoRelatorio } from "@/components/relatorios/BlocoRelatorio";
import type { MotivoPerda, Origem } from "@/lib/funil";
import { moeda } from "@/lib/formatar";
import {
  rotuloEtapaRelatorio,
  rotuloOrigemRelatorio,
  rotuloPerda,
  type Relatorio,
} from "@/lib/relatorios";

/** Do contato ao fechado: funil do período, origens e motivos de perda. */
export function RelatorioVendas({ v }: { v: Relatorio["vendas"] }) {
  const topo = v.funil[0]?.chegaram ?? 0;
  const maiorPerda = v.funil.find((e) => e.etapa === v.maior_perda) ?? null;
  const maiorMotivo = v.perdas[0]?.quantidade ?? 1;

  return (
    <BlocoRelatorio
      id="vendas"
      rotulo="Vendas"
      titulo="Do contato ao fechado"
      resumo={
        v.contatos === 0
          ? "Nenhum contato chegou neste período."
          : `${v.contatos} ${v.contatos === 1 ? "contato chegou" : "contatos chegaram"} no período.${
              maiorPerda
                ? ` A maior perda está na passagem para ${rotuloEtapaRelatorio[maiorPerda.etapa]?.toLowerCase()}: ${maiorPerda.passaram_pct}% seguiram.`
                : ""
            }${v.dias_ate_aceite !== null ? ` Do primeiro contato ao aceite: ${v.dias_ate_aceite} dias em média.` : ""}`
      }
    >
      <table className="w-full border-collapse text-[14px]">
        <caption className="sr-only">Funil do período</caption>
        <thead>
          <tr className="text-left text-[13px] text-hub-suave">
            <th scope="col" className="py-2 pr-2 font-medium">
              Etapa
            </th>
            <th scope="col" className="hidden w-[45%] py-2 pr-2 font-medium sm:table-cell">
              Quantos chegaram aqui
            </th>
            <th scope="col" className="py-2 pr-2 text-right font-medium">
              Total
            </th>
            <th scope="col" className="py-2 pr-2 text-right font-medium">
              Seguiram
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              No funil hoje
            </th>
          </tr>
        </thead>
        <tbody>
          {v.funil.map((e) => (
            <tr key={e.etapa} className="border-t border-hub-borda">
              <th scope="row" className="py-2.5 pr-2 text-left font-medium">
                {rotuloEtapaRelatorio[e.etapa]}
              </th>
              <td className="hidden py-2.5 pr-4 sm:table-cell" aria-hidden="true">
                <span
                  className={`block h-2.5 rounded-full ${e.etapa === "fechado" ? "bg-[#145A37]" : "bg-hub-tinta"}`}
                  style={{ width: `${topo > 0 ? Math.max(2, (e.chegaram / topo) * 100) : 0}%` }}
                />
              </td>
              <td className="py-2.5 pr-2 text-right font-semibold tabular-nums">{e.chegaram}</td>
              <td
                className={`py-2.5 pr-2 text-right tabular-nums ${maiorPerda?.etapa === e.etapa ? "font-semibold text-sit-risco-t" : ""}`}
              >
                {e.passaram_pct === null ? "—" : `${e.passaram_pct}%`}
              </td>
              <td className="py-2.5 text-right tabular-nums text-hub-suave">{e.hoje}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-col gap-2">
        <h3 className="font-semibold">Por origem</h3>
        {v.por_origem.length === 0 ? (
          <p className="text-[14px] text-hub-suave">Sem contatos no período.</p>
        ) : (
          <div className="overflow-x-auto">
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
        )}
        {v.anuncios_cents > 0 && (
          <p className="text-[14px] text-hub-suave">
            Anúncios: {moeda(v.anuncios_cents)} investidos no período
            {v.diagnosticos_por_anuncio > 0
              ? `; cada diagnóstico pago vindo de anúncio custou ${moeda(Math.round(v.anuncios_cents / v.diagnosticos_por_anuncio))}.`
              : "; nenhum diagnóstico pago veio de anúncio ainda."}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-semibold">Motivos de perda</h3>
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
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-[14px] sm:grid-cols-[200px_minmax(0,1fr)_auto]"
              >
                <span>{rotuloPerda[p.motivo as MotivoPerda] ?? p.motivo}</span>
                <span aria-hidden="true" className="hidden h-2 rounded-full bg-[#E6E6E0] sm:block">
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
