import { useState } from "react";

import { PainelLateral } from "@/components/hub/PainelLateral";
import { CampoTexto } from "@/components/propostas/CampoTexto";
import { classeBotaoSecundario } from "@/lib/estilos";

/** Marcar como recusada (o cliente disse não por outro canal). */
export function RecusadaPainel({
  aberto,
  aoFechar,
  aoConfirmar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoConfirmar: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={(v) => !v && aoFechar()}
      titulo="Marcar como recusada"
      descricao="O link deixa de aceitar. A oportunidade continua aberta para você decidir no funil."
      rodape={
        <>
          <button type="button" className={classeBotaoSecundario} onClick={aoFechar}>
            Cancelar
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-sit-risco-t px-5 text-[15px] font-semibold text-white hover:bg-[#7E160E]"
            onClick={() => {
              aoConfirmar(motivo);
              setMotivo("");
              aoFechar();
            }}
          >
            Marcar como recusada
          </button>
        </>
      }
    >
      <CampoTexto
        rotulo="O que o cliente disse (opcional)"
        valor={motivo}
        max={600}
        linhas={3}
        placeholder="Ex.: achou o prazo longo para a época do ano"
        aoMudar={setMotivo}
      />
    </PainelLateral>
  );
}
