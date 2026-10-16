import { Cartao } from "@/components/trafego/Cartao";
import { moeda } from "@/lib/formatar";
import { rotuloPlataforma, type PainelTrafego } from "@/lib/trafego";

/** Contato barato × contato que vira venda, por campanha. */
export function TrafegoComparacao({ p, etiqueta }: { p: PainelTrafego; etiqueta: string }) {
  const comContato = p.campanhas.filter((c) => c.contatos > 0);
  const maxCusto = Math.max(1, ...comContato.map((c) => c.custo_contato_cents ?? 0));
  return (
    <Cartao
      id="comparacao"
      titulo="Contato barato × contato que vira venda"
      texto="O contato mais barato nem sempre compra o diagnóstico."
      etiqueta={etiqueta}
    >
      {comContato.length === 0 ? (
        <p className="text-[14.5px] text-hub-suave">
          Aparece quando as campanhas tiverem contatos ligados.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          <li
            className="grid grid-cols-2 gap-4 text-[12.5px] font-semibold uppercase tracking-[0.06em] text-hub-suave"
            aria-hidden="true"
          >
            <span>Custo por contato · menor é melhor</span>
            <span>Viram diagnóstico pago · maior é melhor</span>
          </li>
          {comContato.map((c) => (
            <li key={c.id} className="flex flex-col gap-1.5">
              <span className="text-[14.5px]">
                <strong className="font-semibold">{c.nome}</strong>{" "}
                <span className="text-hub-suave">
                  {rotuloPlataforma[c.plataforma]}
                  {c.ativa ? "" : " · pausada"}
                </span>
              </span>
              <span className="grid grid-cols-2 gap-4">
                <span className="flex items-center gap-2">
                  <span
                    className="relative h-2 flex-1 rounded-full bg-[#ECECE6]"
                    aria-hidden="true"
                  >
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-hub-tinta"
                      style={{ width: `${((c.custo_contato_cents ?? 0) / maxCusto) * 100}%` }}
                    />
                  </span>
                  <span className="w-20 text-right text-[14px] font-semibold tabular-nums">
                    {c.custo_contato_cents == null ? "—" : moeda(c.custo_contato_cents)}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className="relative h-2 flex-1 rounded-full bg-[#ECECE6]"
                    aria-hidden="true"
                  >
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-sit-ok-t"
                      style={{ width: `${c.pct_diagnostico ?? 0}%` }}
                    />
                  </span>
                  <span className="w-12 text-right text-[14px] font-semibold tabular-nums">
                    {c.pct_diagnostico ?? 0}%
                  </span>
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}
