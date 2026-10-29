import { Pencil, Plus } from "lucide-react";

import { Selo } from "@/components/hub/Selo";
import { Ajuda } from "@/components/trafego/Ajuda";
import { moeda } from "@/lib/formatar";
import { rotuloPlataforma, type CampanhaPainel, type PainelTrafego } from "@/lib/trafego";
import { classeAcaoTexto } from "@/lib/estilos";

const corPlataforma = { meta: "bg-serie-1", google: "bg-serie-2" } as const;
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/**
 * Campanhas (aba padrão do RD-6): investido, contatos, diagnósticos (com quantos % viram
 * diagnóstico, o antigo "contato barato × contato que vira venda") e custo por contato.
 * Cada linha lança valor direto na campanha e abre a edição.
 */
export function TrafegoCampanhas({
  p,
  aoNova,
  aoEditar,
  aoLancar,
}: {
  p: PainelTrafego;
  aoNova: () => void;
  aoEditar: (c: CampanhaPainel) => void;
  aoLancar: (c: CampanhaPainel) => void;
}) {
  const sem = p.sem_campanha;
  const novaCampanha = (
    <button type="button" onClick={aoNova} className={`${classeAcaoTexto} gap-1.5`}>
      <Plus className="size-4" aria-hidden="true" /> Nova campanha
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      {sem.contatos > 0 && (
        <p className="m-0 rounded-xl bg-sit-atencao px-4 py-3 text-[14px] text-sit-atencao-t">
          {plural(sem.contatos, "contato de anúncio está", "contatos de anúncio estão")} sem
          campanha ligada. Preencha "Qual anúncio" na ficha com o nome da campanha.
        </p>
      )}
      {p.campanhas.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-4 text-[14.5px] text-hub-suave">
          Nenhuma campanha cadastrada. Cadastre com o mesmo nome que você usa na Meta ou no Google.
          {novaCampanha}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-hub-borda bg-white">
          <table className="w-full text-[14px] max-md:hidden">
            <thead>
              <tr className="border-b border-hub-borda text-left text-[13.5px] text-hub-suave">
                <th className="py-3 pr-3 pl-5 font-medium">
                  <span className="inline-flex items-center gap-1">
                    Campanha
                    <Ajuda sobre="a ligação do contato com a campanha">
                      O contato entra na campanha pelo campo "Qual anúncio" da ficha, com o mesmo
                      nome da campanha (sem diferença de maiúsculas).
                    </Ajuda>
                  </span>
                </th>
                <th className="py-3 pr-3 font-medium">Situação</th>
                <th className="py-3 pr-3 text-right font-medium">Investido</th>
                <th className="py-3 pr-3 text-right font-medium">Contatos</th>
                <th className="py-3 pr-3 text-right font-medium">
                  <span className="inline-flex items-center gap-1">
                    Diagnósticos
                    <Ajuda sobre="diagnósticos por campanha">
                      Diagnósticos pagos por contatos da campanha. A porcentagem mostra quantos
                      contatos viram diagnóstico: o contato mais barato nem sempre compra.
                    </Ajuda>
                  </span>
                </th>
                <th className="py-3 pr-3 text-right font-medium">Por contato</th>
                <th className="py-2 pr-3 text-right">{novaCampanha}</th>
              </tr>
            </thead>
            <tbody>
              {p.campanhas.map((c) => (
                <tr key={c.id} className="border-b border-[#F0F0EA] last:border-b-0">
                  <td className="py-2.5 pr-3 pl-5">
                    <span className="flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className={`size-2.5 shrink-0 rounded-[2px] ${corPlataforma[c.plataforma]}`}
                      />
                      <span className="flex min-w-0 flex-col">
                        <b className="font-semibold">{c.nome}</b>
                        <span className="text-[12.5px] text-hub-suave">
                          {rotuloPlataforma[c.plataforma]}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <Selo tom={c.ativa ? "ok" : "neutro"}>{c.ativa ? "Ativa" : "Pausada"}</Selo>
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {moeda(c.investido_cents)}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{c.contatos}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {c.diagnosticos}
                    {c.pct_diagnostico != null && (
                      <span className="block text-[12.5px] text-hub-suave">
                        {c.pct_diagnostico}% dos contatos
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">
                    {moeda(c.custo_contato_cents)}
                  </td>
                  <td className="py-1 pr-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => aoLancar(c)}
                      className={`${classeAcaoTexto}`}
                    >
                      Lançar valor
                      <span className="sr-only"> em {c.nome}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Editar ${c.nome}`}
                      onClick={() => aoEditar(c)}
                      className="inline-flex size-11 items-center justify-center rounded-lg align-middle text-hub-suave hover:bg-hub-fundo hover:text-hub-tinta"
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Celular: uma linha por campanha (toque edita; + lança valor) */}
          <div className="md:hidden">
            <div className="flex items-center justify-between border-b border-hub-borda py-1 pr-1 pl-4">
              <span className="text-[13px] font-semibold text-[#2A2D33]">
                {plural(p.campanhas.length, "campanha", "campanhas")}
              </span>
              {novaCampanha}
            </div>
            <ul className="m-0 list-none p-0">
              {p.campanhas.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center border-b border-[#F0F0EA] last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => aoEditar(c)}
                    aria-label={`Editar ${c.nome}`}
                    className="flex min-h-14 min-w-0 flex-1 flex-col gap-0.5 py-2.5 pr-2 pl-4 text-left"
                  >
                    <span className="flex w-full items-baseline justify-between gap-2">
                      <b className="truncate text-[14.5px] font-semibold">{c.nome}</b>
                      <b className="shrink-0 text-[14px] font-semibold tabular-nums">
                        {moeda(c.custo_contato_cents)}
                      </b>
                    </span>
                    <span className="truncate text-[12.5px] text-hub-suave">
                      {c.plataforma === "meta" ? "Meta" : "Google"}
                      {c.ativa ? "" : " · pausada"} · {moeda(c.investido_cents)} ·{" "}
                      {plural(c.contatos, "contato", "contatos")} ·{" "}
                      {plural(c.diagnosticos, "diagnóstico", "diagnósticos")}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Lançar valor em ${c.nome}`}
                    onClick={() => aoLancar(c)}
                    className="mr-1 flex size-11 shrink-0 items-center justify-center rounded-lg text-hub-tinta hover:bg-hub-selecao"
                  >
                    <Plus className="size-5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
