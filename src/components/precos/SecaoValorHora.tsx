import { CampoNumero } from "@/components/hub/CampoNumero";
import { SecaoPreco } from "@/components/precos/SecaoPreco";
import type { PropsSecao } from "@/components/precos/tipos";
import { moeda } from "@/lib/formatar";

export function SecaoValorHora({ p, mudar }: PropsSecao) {
  return (
    <SecaoPreco
      id="valor-hora"
      titulo="Valor da hora e piso"
      texto="A hora é a base de todo cálculo. Abaixo do piso, a proposta só sai com um motivo registrado."
      usadoEm={["Propostas", "Pedidos"]}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoNumero
          rotulo="Hora de referência"
          prefixo="R$"
          sufixo="/ h"
          escala={100}
          casas={0}
          valor={p.hour_cents}
          aoMudar={(n) => mudar("hour_cents", n ?? 0)}
        />
        <CampoNumero
          rotulo="Piso"
          prefixo="R$"
          sufixo="/ h"
          escala={100}
          casas={0}
          valor={p.floor_cents}
          aoMudar={(n) => mudar("floor_cents", n ?? 0)}
          ajuda="Entre o piso e a hora, o desconto fica registrado. Abaixo do piso, pede motivo."
        />
      </div>
      <p className="rounded-xl bg-hub-fundo px-4 py-3 text-[14px]">
        <span className="font-semibold">Exemplo:</span> 8 h saem por {moeda(8 * p.hour_cents)}; com
        o piso, no mínimo {moeda(8 * p.floor_cents)}.
      </p>
    </SecaoPreco>
  );
}
