import { CampoNumero } from "@/components/hub/CampoNumero";
import { SecaoPreco } from "@/components/precos/SecaoPreco";
import type { PropsSecao } from "@/components/precos/tipos";
import type { Precos } from "@/lib/precos";

export function SecaoValidade({ p, mudar }: PropsSecao) {
  return (
    <SecaoPreco
      id="validade"
      titulo="Validade da proposta e reajuste"
      texto="Depois do prazo, a proposta precisa ser renovada com os preços do dia."
      usadoEm={["Propostas", "Mensalidade"]}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoNumero
          rotulo="Proposta vale"
          sufixo="dias"
          casas={0}
          valor={p.validity_days}
          aoMudar={(n) => mudar("validity_days", Math.min(90, Math.max(1, Math.round(n ?? 15))))}
          ajuda="Conta a partir do envio."
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reajuste" className="text-[14px] font-medium">
            Reajuste anual
          </label>
          <select
            id="reajuste"
            value={p.adjustment_index}
            onChange={(e) =>
              mudar("adjustment_index", e.target.value as Precos["adjustment_index"])
            }
            className="h-11 rounded-xl border border-[#DADAD3] bg-white px-3 text-base md:text-[15px]"
          >
            <option value="IPCA">IPCA</option>
            <option value="IGP-M">IGP-M</option>
            <option value="nenhum">Sem reajuste</option>
          </select>
          <p className="text-[13px] text-hub-suave">
            Aplicado à mensalidade no aniversário do contrato.
          </p>
        </div>
      </div>
    </SecaoPreco>
  );
}
