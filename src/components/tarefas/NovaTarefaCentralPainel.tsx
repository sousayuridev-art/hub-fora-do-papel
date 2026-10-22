import { useEffect, useState } from "react";

import { BotoesPainel } from "@/components/hub/BotoesPainel";
import { CampoArea, CampoEscolha, CampoTexto } from "@/components/hub/Campo";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { Segmentos } from "@/components/tarefas/Segmentos";
import type { PrioridadeTarefa } from "@/lib/projetos";
import { opcoesPrioridade, type NovaTarefa, type ProjetoOpcao } from "@/lib/tarefas";

const INTERNA = "__interna__";
const HUB = "__hub__";

/** Nova tarefa com todos os campos (prazo, prioridade, projeto). No celular é o caminho principal. */
export function NovaTarefaCentralPainel({
  aberto,
  aoMudar,
  projetos,
  projetoPadrao,
  tipoPadrao,
  aoCriar,
}: {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  projetos: ProjetoOpcao[];
  projetoPadrao?: string | undefined;
  tipoPadrao?: "interna" | "hub" | undefined;
  aoCriar: (v: NovaTarefa, projeto: ProjetoOpcao | null) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [destino, setDestino] = useState(INTERNA);
  const [card, setCard] = useState("");
  const [prazo, setPrazo] = useState("");
  const [prioridade, setPrioridade] = useState<PrioridadeTarefa>("normal");
  const [area, setArea] = useState("");
  const [descricao, setDescricao] = useState("");

  useEffect(() => {
    if (!aberto) return;
    setTitulo("");
    setCard("");
    setPrazo("");
    setPrioridade("normal");
    setArea("");
    setDescricao("");
    setDestino(projetoPadrao ?? (tipoPadrao === "hub" ? HUB : INTERNA));
  }, [aberto, projetoPadrao, tipoPadrao]);

  const projeto = projetos.find((p) => p.id === destino) ?? null;
  const ok = titulo.trim().length >= 2;

  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Nova tarefa"
      descricao="Com projeto, é tarefa de cliente. Sem projeto, é interna ou do Hub."
      rodape={
        <BotoesPainel
          rotulo="Criar tarefa"
          desabilitado={!ok}
          aoCancelar={() => aoMudar(false)}
          aoConfirmar={() => {
            aoCriar(
              {
                titulo: titulo.trim(),
                projetoId: projeto?.id ?? null,
                tipo: projeto ? "cliente" : destino === HUB ? "hub" : "interna",
                prazo: prazo || null,
                prioridade,
                card: destino === HUB ? card.trim() || null : null,
                area: area.trim() || null,
                descricao: descricao.trim() || null,
              },
              projeto,
            );
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
          autoComplete="off"
          placeholder="O que precisa ser feito"
        />
        <CampoEscolha
          rotulo="Projeto"
          valor={destino}
          aoMudar={setDestino}
          opcoes={[
            { id: INTERNA, rotulo: "Sem projeto (interna)" },
            { id: HUB, rotulo: "Sem projeto (Hub)" },
            ...projetos.map((p) => ({ id: p.id, rotulo: `${p.empresa} › ${p.nome}` })),
          ]}
        />
        {destino === HUB && (
          <CampoTexto
            rotulo="Código do card (opcional)"
            valor={card}
            aoMudar={setCard}
            maxLength={20}
            autoComplete="off"
            placeholder="SS-2"
          />
        )}
        <CampoTexto rotulo="Prazo (opcional)" tipo="date" valor={prazo} aoMudar={setPrazo} />
        <div className="flex flex-col gap-1.5">
          <span className="text-[14px] font-medium">Prioridade</span>
          <Segmentos
            rotulo="Prioridade"
            valor={prioridade}
            opcoes={opcoesPrioridade}
            aoEscolher={setPrioridade}
            tomAtivo={(p) => (p === "alta" ? "text-sit-risco-t" : undefined)}
          />
        </div>
        <CampoTexto
          rotulo="Área (opcional)"
          valor={area}
          aoMudar={setArea}
          maxLength={40}
          autoComplete="off"
          placeholder="Financeiro, Vendas, Agendamento…"
        />
        <CampoArea
          rotulo="Detalhe (opcional)"
          valor={descricao}
          aoMudar={setDescricao}
          maxLength={600}
          linhas={3}
        />
      </div>
    </PainelLateral>
  );
}
