import { useEffect, useState } from "react";

import { BotoesPainel } from "@/components/hub/BotoesPainel";
import { CampoArea, CampoEscolha, CampoTexto } from "@/components/hub/Campo";
import { CampoNumero } from "@/components/hub/CampoNumero";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { isoDoDia } from "@/lib/formatar";

export type HorasNovas = { projetoId: string; dia: string; minutos: number; nota: string };

/** Lançar horas trabalhadas: projeto (quando vem da lista), dia, horas e o que foi feito. */
export function LancarHorasPainel({
  aberto,
  aoMudar,
  projetos,
  projetoFixo,
  aoLancar,
}: {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  projetos?: { id: string; rotulo: string }[];
  projetoFixo?: { id: string; rotulo: string };
  aoLancar: (v: HorasNovas) => void;
}) {
  const [projeto, setProjeto] = useState(projetoFixo?.id ?? "");
  const [dia, setDia] = useState(isoDoDia(new Date()));
  const [horas, setHoras] = useState<number | null>(null);
  const [nota, setNota] = useState("");

  useEffect(() => {
    if (aberto) {
      setProjeto(projetoFixo?.id ?? (projetos?.length === 1 ? (projetos[0]?.id ?? "") : ""));
      setDia(isoDoDia(new Date()));
      setHoras(null);
      setNota("");
    }
  }, [aberto, projetoFixo?.id, projetos]);

  const minutos = horas == null ? 0 : Math.round(horas * 60);
  const valido = projeto !== "" && minutos >= 1 && minutos <= 1440 && dia !== "";

  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Lançar horas"
      descricao={projetoFixo?.rotulo ?? "As horas somam no projeto e na semana."}
      rodape={
        <BotoesPainel
          rotulo="Lançar"
          desabilitado={!valido}
          aoCancelar={() => aoMudar(false)}
          aoConfirmar={() => {
            aoLancar({ projetoId: projeto, dia, minutos, nota: nota.trim() });
            aoMudar(false);
          }}
        />
      }
    >
      <div className="flex flex-col gap-4">
        {!projetoFixo && (
          <CampoEscolha
            rotulo="Projeto"
            valor={projeto}
            aoMudar={setProjeto}
            vazio="Escolha o projeto"
            opcoes={(projetos ?? []).map((p) => ({ id: p.id, rotulo: p.rotulo }))}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <CampoTexto
            rotulo="Dia"
            tipo="date"
            valor={dia}
            aoMudar={setDia}
            max={isoDoDia(new Date())}
          />
          <CampoNumero
            rotulo="Horas"
            valor={horas}
            aoMudar={setHoras}
            sufixo="h"
            casas={2}
            placeholder="1,5"
          />
        </div>
        {horas != null && minutos > 1440 && (
          <p className="text-[13.5px] text-sit-risco-t">Um lançamento vai até 24 horas.</p>
        )}
        <CampoArea
          rotulo="O que foi feito (opcional)"
          valor={nota}
          aoMudar={setNota}
          maxLength={300}
          linhas={2}
        />
      </div>
    </PainelLateral>
  );
}
