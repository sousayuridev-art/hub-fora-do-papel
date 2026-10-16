import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { CamposProximoPasso } from "@/components/funil/CamposProximoPasso";
import {
  etapas,
  motivos,
  rotuloEtapa,
  type Etapa,
  type MotivoPerda,
  type Oportunidade,
  type ProximoPasso,
} from "@/lib/funil";
import { cn } from "@/lib/utils";

import { passoDe } from "@/components/funil/passoDe";

/** Editar só o próximo passo. */
export function ProximoPassoPainel({
  o,
  aoFechar,
  aoSalvar,
}: {
  o: Oportunidade | null;
  aoFechar: () => void;
  aoSalvar: (o: Oportunidade, passo: ProximoPasso) => void;
}) {
  const [passo, setPasso] = useState<ProximoPasso>(passoDe(o));
  useEffect(() => setPasso(passoDe(o)), [o]);
  const valido = passo.texto.trim().length > 0 && passo.data.length > 0;
  return (
    <PainelLateral
      aberto={o !== null}
      aoMudar={(v) => !v && aoFechar()}
      titulo="Próximo passo"
      descricao={o?.company_name}
      rodape={
        <>
          <Button variant="outline" className="h-11" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button
            className="h-11 bg-[#FFB020] text-hub-tinta hover:bg-[#F5A50F]"
            disabled={!valido}
            onClick={() => {
              if (!o) return;
              aoSalvar(o, passo);
              aoFechar();
            }}
          >
            Salvar
          </Button>
        </>
      }
    >
      <CamposProximoPasso valor={passo} aoMudar={setPasso} prefixo="passo" />
    </PainelLateral>
  );
}
