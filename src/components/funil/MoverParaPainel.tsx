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

/**
 * Mover para outra etapa (no celular substitui o arrastar). Pede próximo passo se faltar.
 * Fechado à mão pede motivo (card REV-5): o caminho normal é o cliente aceitar a proposta.
 */
export function MoverParaPainel({
  o,
  etapaInicial = null,
  aoFechar,
  aoMover,
}: {
  o: Oportunidade | null;
  etapaInicial?: Etapa | null;
  aoFechar: () => void;
  aoMover: (o: Oportunidade, etapa: Etapa, passo?: ProximoPasso, motivoFechar?: string) => void;
}) {
  const [etapa, setEtapa] = useState<Etapa | null>(null);
  const [passo, setPasso] = useState<ProximoPasso>(passoDe(o));
  const [motivo, setMotivo] = useState("");
  useEffect(() => {
    setEtapa(etapaInicial);
    setPasso(passoDe(o));
    setMotivo("");
  }, [o, etapaInicial]);
  const precisaPasso = etapa !== null && etapa !== "fechado";
  const precisaMotivo = etapa === "fechado";
  const passoOk = !precisaPasso || (passo.texto.trim() && passo.data);
  const motivoOk = !precisaMotivo || motivo.trim().length >= 3;

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
            disabled={!o || !etapa || etapa === o.stage || !passoOk || !motivoOk}
            onClick={() => {
              if (!o || !etapa) return;
              aoMover(
                o,
                etapa,
                precisaPasso ? passo : undefined,
                precisaMotivo ? motivo.trim() : undefined,
              );
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
      {precisaMotivo && (
        <div className="mt-6 flex flex-col gap-2 border-t border-hub-borda pt-5">
          <Label htmlFor="mover-motivo" className="text-[15px] font-semibold">
            Por que fechar sem proposta aceita?
          </Label>
          <p className="text-[13px] text-hub-suave">
            O normal é o cliente aceitar a proposta pelo link: aí a oportunidade fecha sozinha e o
            projeto nasce. Use aqui só quando o acordo foi feito fora do Hub.
          </p>
          <Textarea
            id="mover-motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={400}
            rows={3}
            className="text-base"
            placeholder="Ex.: contrato assinado em papel no dia 28/10"
          />
        </div>
      )}
    </PainelLateral>
  );
}
