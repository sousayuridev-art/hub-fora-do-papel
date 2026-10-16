import { useEffect, useState } from "react";

import { BotoesPainel } from "@/components/hub/BotoesPainel";
import { CampoArea, CampoTexto } from "@/components/hub/Campo";
import { PainelLateral } from "@/components/hub/PainelLateral";

export type PendenciaNova = { titulo: string; detalhe: string; prazo: string | null };

/** Algo que o cliente precisa fazer (enviar fotos, dar um acesso). Aparece no portal dele. */
export function NovaPendenciaPainel({
  aberto,
  aoMudar,
  aoCriar,
}: {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  aoCriar: (v: PendenciaNova) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [detalhe, setDetalhe] = useState("");
  const [prazo, setPrazo] = useState("");
  useEffect(() => {
    if (aberto) {
      setTitulo("");
      setDetalhe("");
      setPrazo("");
    }
  }, [aberto]);
  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Nova pendência do cliente"
      descricao="O cliente vê no portal e marca como feita."
      rodape={
        <BotoesPainel
          rotulo="Criar pendência"
          desabilitado={titulo.trim().length < 2}
          aoCancelar={() => aoMudar(false)}
          aoConfirmar={() => {
            aoCriar({ titulo: titulo.trim(), detalhe: detalhe.trim(), prazo: prazo || null });
            aoMudar(false);
          }}
        />
      }
    >
      <div className="flex flex-col gap-4">
        <CampoTexto
          rotulo="O que o cliente precisa fazer"
          valor={titulo}
          aoMudar={setTitulo}
          maxLength={120}
          placeholder="Enviar as fotos da equipe"
        />
        <CampoArea
          rotulo="Detalhe (opcional)"
          valor={detalhe}
          aoMudar={setDetalhe}
          maxLength={600}
          linhas={2}
        />
        <CampoTexto rotulo="Prazo (opcional)" tipo="date" valor={prazo} aoMudar={setPrazo} />
      </div>
    </PainelLateral>
  );
}
