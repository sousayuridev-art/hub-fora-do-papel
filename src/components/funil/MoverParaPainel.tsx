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

/** Mover para outra etapa (no celular substitui o arrastar). Pede próximo passo se faltar. */
export function MoverParaPainel({
  o,
  aoFechar,
  aoMover,
}: {
  o: Oportunidade | null;
  aoFechar: () => void;
  aoMover: (o: Oportunidade, etapa: Etapa, passo?: ProximoPasso) => void;
}) {
  const [etapa, setEtapa] = useState<Etapa | null>(null);
  const [passo, setPasso] = useState<ProximoPasso>(passoDe(o));
  useEffect(() => {
    setEtapa(null);
    setPasso(passoDe(o));
  }, [o]);
  const precisaPasso = etapa !== null && etapa !== "fechado";
  const passoOk = !precisaPasso || (passo.texto.trim() && passo.data);

  return (
    <PainelLateral
      aberto={o !== null}
      aoMudar={(v) => !v && aoFechar()}
      titulo="Mover para"
      descricao={o ? `${o.company_name} está em ${rotuloEtapa[o.stage]}.` : undefined}
      rodape={
        <>
          <Button variant="outline" className="h-11" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button
            className="h-11 bg-[#FFB020] text-hub-tinta hover:bg-[#F5A50F]"
            disabled={!o || !etapa || etapa === o.stage || !passoOk}
            onClick={() => {
              if (!o || !etapa) return;
              aoMover(o, etapa, precisaPasso ? passo : undefined);
              aoFechar();
            }}
          >
            Mover
          </Button>
        </>
      }
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Etapa</legend>
        {etapas.map((e) => (
          <button
            key={e.id}
            type="button"
            disabled={e.id === o?.stage}
            aria-pressed={etapa === e.id}
            onClick={() => setEtapa(e.id)}
            className={cn(
              "flex min-h-12 items-center justify-between rounded-xl border px-4 text-left text-[15px] transition-colors",
              etapa === e.id
                ? "border-hub-tinta bg-hub-tinta text-white"
                : "border-hub-borda bg-white hover:border-[#C9C9C2]",
              e.id === o?.stage && "cursor-default opacity-50",
            )}
          >
            {e.rotulo}
            {e.id === o?.stage && <span className="text-[13px]">Etapa atual</span>}
          </button>
        ))}
      </fieldset>
      {precisaPasso && (
        <div className="mt-6 border-t border-hub-borda pt-5">
          <CamposProximoPasso valor={passo} aoMudar={setPasso} prefixo="mover" />
        </div>
      )}
    </PainelLateral>
  );
}
