import { useEffect, useState } from "react";

import { BotoesPainel } from "@/components/hub/BotoesPainel";
import { CampoArea, CampoTexto } from "@/components/hub/Campo";
import { PainelLateral } from "@/components/hub/PainelLateral";

export type TarefaNova = { titulo: string; area: string; descricao: string };

/** Tarefa interna do quadro (o cliente não vê). */
export function NovaTarefaPainel({
  aberto,
  aoMudar,
  ciclo,
  aoCriar,
}: {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  ciclo: number;
  aoCriar: (v: TarefaNova) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [area, setArea] = useState("");
  const [descricao, setDescricao] = useState("");
  useEffect(() => {
    if (aberto) {
      setTitulo("");
      setDescricao("");
    }
  }, [aberto]);
  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Nova tarefa"
      descricao={`Entra em "A fazer" no ciclo ${ciclo}. O cliente não vê o quadro.`}
      rodape={
        <BotoesPainel
          rotulo="Criar tarefa"
          desabilitado={titulo.trim().length < 2}
          aoCancelar={() => aoMudar(false)}
          aoConfirmar={() => {
            aoCriar({ titulo: titulo.trim(), area: area.trim(), descricao: descricao.trim() });
            aoMudar(false);
          }}
        />
      }
    >
      <div className="flex flex-col gap-4">
        <CampoTexto
          rotulo="Tarefa"
          valor={titulo}
          aoMudar={setTitulo}
          maxLength={120}
          placeholder="Página de tratamentos no celular"
        />
        <CampoTexto
          rotulo="Área (opcional)"
          valor={area}
          aoMudar={setArea}
          maxLength={40}
          placeholder="Agendamento, Painel, Sobre…"
        />
        <CampoArea
          rotulo="Detalhe (opcional)"
          valor={descricao}
          aoMudar={setDescricao}
          maxLength={600}
          linhas={2}
        />
      </div>
    </PainelLateral>
  );
}
