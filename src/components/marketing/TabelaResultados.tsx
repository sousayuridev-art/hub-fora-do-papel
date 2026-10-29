import { moeda } from "@/lib/formatar";
import { nomeDoGrupo, type Agrupar, type LinhaResultado } from "@/lib/marketing";

const n = (x: number) => x.toLocaleString("pt-BR");
const porMil = (x: number | null) =>
  x === null ? "—" : x.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/** Resultados por grupo (MK-4). Os números chegam prontos do banco; aqui só formata. */
export function TabelaResultados({
  agrupar,
  linhas,
}: {
  agrupar: Agrupar;
  linhas: LinhaResultado[];
}) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-hub-borda bg-white md:block">
        <table className="w-full text-[14px] tabular-nums">
          <caption className="sr-only">Resultados por {agrupar}</caption>
          <thead className="bg-hub-fundo text-left text-[13px] text-hub-suave">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Grupo
              </th>
              <th scope="col" className="px-3 py-3 text-right font-medium">
                Versões
              </th>
              <th scope="col" className="px-3 py-3 text-right font-medium">
                Alcance
              </th>
              <th scope="col" className="px-3 py-3 text-right font-medium">
                Salvamentos por mil
              </th>
              <th scope="col" className="px-3 py-3 text-right font-medium">
                Cliques
              </th>
              <th scope="col" className="px-3 py-3 text-right font-medium">
                Mensagens
              </th>
              <th scope="col" className="px-3 py-3 text-right font-medium">
                Contatos
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Negócios fechados
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.chave ?? "nenhum"} className="border-t border-hub-borda">
                <th scope="row" className="px-4 py-3 text-left font-medium">
                  {nomeDoGrupo(agrupar, l)}
                </th>
                <td className="px-3 py-3 text-right">
                  {n(l.versoes)}
                  {l.com_resultado < l.versoes && (
                    <span className="block text-[12.5px] text-hub-suave">
                      {n(l.com_resultado)} com números
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-right">{n(l.alcance)}</td>
                <td className="px-3 py-3 text-right">{porMil(l.salvamentos_por_mil)}</td>
                <td className="px-3 py-3 text-right">{n(l.cliques)}</td>
                <td className="px-3 py-3 text-right">{n(l.mensagens)}</td>
                <td className="px-3 py-3 text-right font-semibold">{n(l.contatos)}</td>
                <td className="px-4 py-3 text-right">
                  {n(l.negocios_fechados)}
                  {l.valor_fechado > 0 && (
                    <span className="block text-[12.5px] text-hub-suave">
                      {moeda(l.valor_fechado)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-2 md:hidden" aria-label={`Resultados por ${agrupar}`}>
        {linhas.map((l) => (
          <li
            key={l.chave ?? "nenhum"}
            className="rounded-2xl border border-hub-borda bg-white p-4"
          >
            <b className="text-[15px]">{nomeDoGrupo(agrupar, l)}</b>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[14px] tabular-nums">
              <dt className="text-hub-suave">Contatos</dt>
              <dd className="text-right font-semibold">{n(l.contatos)}</dd>
              <dt className="text-hub-suave">Negócios fechados</dt>
              <dd className="text-right">
                {n(l.negocios_fechados)}
                {l.valor_fechado > 0 ? ` · ${moeda(l.valor_fechado)}` : ""}
              </dd>
              <dt className="text-hub-suave">Alcance</dt>
              <dd className="text-right">{n(l.alcance)}</dd>
              <dt className="text-hub-suave">Salvamentos por mil</dt>
              <dd className="text-right">{porMil(l.salvamentos_por_mil)}</dd>
              <dt className="text-hub-suave">Versões</dt>
              <dd className="text-right">
                {n(l.versoes)} ({n(l.com_resultado)} com números)
              </dd>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
