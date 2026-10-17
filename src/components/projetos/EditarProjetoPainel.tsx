import { useEffect, useState } from "react";

import { BotoesPainel } from "@/components/hub/BotoesPainel";
import { CampoTexto } from "@/components/hub/Campo";
import { CampoNumero } from "@/components/hub/CampoNumero";
import { PainelLateral } from "@/components/hub/PainelLateral";
import type { DetalheProjeto } from "@/lib/projetos";

export type CamposProjeto = { nome: string; horas_estimadas: number; lancamento: string };

/** Nome, horas estimadas e lançamento previsto. Valor e parcelas mudam no Financeiro. */
export function EditarProjetoPainel({
  d,
  aberto,
  aoMudar,
  aoSalvar,
}: {
  d: DetalheProjeto;
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  aoSalvar: (v: CamposProjeto) => void;
}) {
  const [nome, setNome] = useState(d.projeto.name);
  const [horas, setHoras] = useState<number | null>(d.projeto.hours_estimated);
  const [lancamento, setLancamento] = useState(d.projeto.launch_date ?? "");
  useEffect(() => {
    if (aberto) {
      setNome(d.projeto.name);
      setHoras(d.projeto.hours_estimated);
      setLancamento(d.projeto.launch_date ?? "");
    }
  }, [aberto, d.projeto]);
  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Editar projeto"
      descricao="O valor e as parcelas ficam no Financeiro."
      rodape={
        <BotoesPainel
          rotulo="Salvar"
          desabilitado={nome.trim().length < 2}
          aoCancelar={() => aoMudar(false)}
          aoConfirmar={() => {
            aoSalvar({ nome: nome.trim(), horas_estimadas: horas ?? 0, lancamento });
            aoMudar(false);
          }}
        />
      }
    >
      <div className="flex flex-col gap-4">
        <CampoTexto rotulo="Nome do projeto" valor={nome} aoMudar={setNome} maxLength={120} />
        <CampoNumero
          rotulo="Horas estimadas"
          valor={horas}
          aoMudar={setHoras}
          sufixo="h"
          ajuda="Base do alerta de horas: atenção em 80%, risco acima de 100%."
        />
        <CampoTexto
          rotulo="Lançamento previsto"
          tipo="date"
          valor={lancamento}
          aoMudar={setLancamento}
        />
      </div>
    </PainelLateral>
  );
}
