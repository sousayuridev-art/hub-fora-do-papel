import { Pencil, Plus } from "lucide-react";

import { Selo } from "@/components/hub/Selo";
import { Cartao } from "@/components/trafego/Cartao";
import { moeda } from "@/lib/formatar";
import { rotuloPlataforma, type CampanhaPainel, type PainelTrafego } from "@/lib/trafego";

/** Campanhas: investido, contatos, diagnósticos e custo por contato no período. Tabela vira cartões no celular. */
export function TrafegoCampanhas({
  p,
  etiqueta,
  aoNova,
  aoEditar,
}: {
  p: PainelTrafego;
  etiqueta: string;
  aoNova: () => void;
  aoEditar: (c: CampanhaPainel) => void;
}) {
  const sem = p.sem_campanha;
  return (
    <Cartao
      id="campanhas"
      titulo="Campanhas"
      texto={
        'O contato entra na campanha pelo campo "Qual anúncio" da ficha, com o mesmo nome da campanha.'
      }
      etiqueta={etiqueta}
      acao={
        <button
          type="button"
          onClick={aoNova}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-[14px] font-medium text-[#1E3FA8] hover:bg-sit-info"
        >
          <Plus className="size-4" aria-hidden="true" /> Nova campanha
        </button>
      }
    >
      {p.campanhas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#D6D6CF] p-4 text-[14.5px] text-hub-suave">
          Nenhuma campanha cadastrada. Cadastre com o mesmo nome que você usa na Meta ou no Google.
        </p>
      ) : (
        <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
          <table className="w-full min-w-[640px] text-[14.5px] max-md:hidden">
            <thead>
              <tr className="border-b border-hub-borda text-left text-[13px] text-hub-suave">
                <th className="py-2 pr-3 font-medium">Campanha</th>
                <th className="py-2 pr-3 font-medium">Situação</th>
                <th className="py-2 pr-3 text-right font-medium">Investido</th>
                <th className="py-2 pr-3 text-right font-medium">Contatos</th>
                <th className="py-2 pr-3 text-right font-medium">Diagnósticos</th>
                <th className="py-2 pr-3 text-right font-medium">Custo por contato</th>
                <th className="py-2">
                  <span className="sr-only">Editar</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {p.campanhas.map((c) => (
                <tr key={c.id} className="border-b border-hub-borda last:border-b-0">
                  <td className="py-3 pr-3">
                    <span className="block font-medium">{c.nome}</span>
                    <span className="text-[13px] text-hub-suave">
                      {rotuloPlataforma[c.plataforma]}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <Selo tom={c.ativa ? "ok" : "neutro"}>{c.ativa ? "Ativa" : "Pausada"}</Selo>
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums">{moeda(c.investido_cents)}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{c.contatos}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{c.diagnosticos}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">
                    {c.custo_contato_cents == null ? "—" : moeda(c.custo_contato_cents)}
                  </td>
                  <td className="py-1 text-right">
                    <button
                      type="button"
                      aria-label={`Editar ${c.nome}`}
                      onClick={() => aoEditar(c)}
                      className="inline-flex size-11 items-center justify-center rounded-lg text-hub-suave hover:bg-hub-fundo hover:text-hub-tinta"
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="flex flex-col gap-2 md:hidden">
            {p.campanhas.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => aoEditar(c)}
                  className="flex w-full flex-col gap-2 rounded-xl border border-hub-borda p-4 text-left"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="flex flex-col">
                      <span className="font-semibold">{c.nome}</span>
                      <span className="text-[13px] text-hub-suave">
                        {rotuloPlataforma[c.plataforma]}
                      </span>
                    </span>
                    <Selo tom={c.ativa ? "ok" : "neutro"}>{c.ativa ? "Ativa" : "Pausada"}</Selo>
                  </span>
                  <span className="grid grid-cols-3 gap-2 text-[13.5px]">
                    <span>
                      <span className="block text-hub-suave">Investido</span>
                      <span className="tabular-nums">{moeda(c.investido_cents)}</span>
                    </span>
                    <span>
                      <span className="block text-hub-suave">Contatos</span>
                      <span className="tabular-nums">{c.contatos}</span>
                    </span>
                    <span>
                      <span className="block text-hub-suave">Por contato</span>
                      <span className="tabular-nums">
                        {c.custo_contato_cents == null ? "—" : moeda(c.custo_contato_cents)}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {sem.contatos > 0 && (
        <p className="rounded-xl bg-sit-atencao px-4 py-3 text-[14px] text-sit-atencao-t">
          {sem.contatos}{" "}
          {sem.contatos === 1 ? "contato de anúncio está" : "contatos de anúncio estão"} sem
          campanha ligada. Preencha "Qual anúncio" na ficha com o nome da campanha.
        </p>
      )}
    </Cartao>
  );
}
