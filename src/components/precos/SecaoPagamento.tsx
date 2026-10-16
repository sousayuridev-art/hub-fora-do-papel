import { CampoNumero } from "@/components/hub/CampoNumero";
import { SecaoPreco } from "@/components/precos/SecaoPreco";
import type { PropsSecao } from "@/components/precos/tipos";
import { moeda } from "@/lib/formatar";

export function SecaoPagamento({ p, mudar }: PropsSecao) {
  const formas = [
    ["pay_pix", "Pix", null],
    ["pay_boleto", "Boleto", null],
    ["pay_card", "Cartão de crédito", "taxa repassada ao cliente"],
  ] as const;
  return (
    <SecaoPreco
      id="pagamento"
      titulo="Condições de pagamento"
      texto="Como a proposta divide o valor e o que acontece quando um pagamento atrasa."
      usadoEm={["Propostas", "Cobranças"]}
    >
      <div className="flex flex-col gap-2">
        <CampoNumero
          className="sm:max-w-[260px]"
          rotulo="Divide em 3 partes acima de"
          prefixo="R$"
          escala={100}
          casas={0}
          valor={p.split_threshold_cents}
          aoMudar={(n) => mudar("split_threshold_cents", Math.max(100, n ?? 1000000))}
        />
        <ul className="grid gap-2 text-[14px] sm:grid-cols-2">
          <li className="rounded-xl bg-hub-fundo px-4 py-3">
            <span className="font-semibold">Até {moeda(p.split_threshold_cents)}:</span> 50% no
            aceite · 50% na entrega
          </li>
          <li className="rounded-xl bg-hub-fundo px-4 py-3">
            <span className="font-semibold">Acima:</span> 40% no aceite · 30% na entrega de um ciclo
            · 30% na entrega final
          </li>
        </ul>
      </div>
      <div className="grid gap-4 border-t border-hub-borda pt-4 sm:grid-cols-2">
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-[14px] font-medium">Formas aceitas</legend>
          {formas.map(([campo, nome, nota]) => (
            <label
              key={campo}
              className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]"
            >
              <input
                type="checkbox"
                checked={p[campo]}
                onChange={(e) => mudar(campo, e.target.checked)}
                className="size-5 accent-[#0E1013]"
              />
              {nome}
              {nota && <span className="text-[13px] text-hub-suave">· {nota}</span>}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-col gap-3">
          <CampoNumero
            rotulo="Multa por atraso"
            sufixo="%"
            valor={p.late_fee_pct}
            aoMudar={(n) => mudar("late_fee_pct", Math.min(2, Math.max(0, n ?? 0)))}
            ajuda="O máximo permitido é 2%."
          />
          <CampoNumero
            rotulo="Juros"
            sufixo="% ao mês"
            valor={p.interest_pct}
            aoMudar={(n) => mudar("interest_pct", Math.max(0, n ?? 0))}
          />
        </div>
      </div>
    </SecaoPreco>
  );
}
