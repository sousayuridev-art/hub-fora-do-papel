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

/** Arquivar com motivo obrigatório ("Outro" pede nota). */
export function ArquivarPainel({
  o,
  aoFechar,
  aoArquivar,
}: {
  o: Oportunidade | null;
  aoFechar: () => void;
  aoArquivar: (o: Oportunidade, motivo: MotivoPerda, nota: string) => void;
}) {
  const [motivo, setMotivo] = useState<MotivoPerda | null>(null);
  const [nota, setNota] = useState("");
  useEffect(() => {
    setMotivo(null);
    setNota("");
  }, [o]);
  const valido = motivo !== null && (motivo !== "outro" || nota.trim().length > 0);

  return (
    <PainelLateral
      aberto={o !== null}
      aoMudar={(v) => !v && aoFechar()}
      titulo="Arquivar contato"
      descricao={
        o ? `${o.company_name} sai do funil e fica em Arquivados, com o motivo.` : undefined
      }
      rodape={
        <>
          <Button variant="outline" className="h-11" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button
            className="h-11 bg-sit-risco-t text-white hover:bg-[#7F170F]"
            disabled={!valido}
            onClick={() => {
              if (!o || !motivo) return;
              aoArquivar(o, motivo, nota);
              aoFechar();
            }}
          >
            Arquivar
          </Button>
        </>
      }
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[14px] font-medium">Por que não seguiu? *</legend>
        {motivos.map((m) => (
          <label
            key={m.id}
            className={cn(
              "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 text-[15px]",
              motivo === m.id ? "border-hub-tinta bg-hub-selecao" : "border-hub-borda bg-white",
            )}
          >
            <input
              type="radio"
              name="motivo"
              value={m.id}
              checked={motivo === m.id}
              onChange={() => setMotivo(m.id)}
              className="size-4 accent-[#0E1013]"
            />
            {m.rotulo}
          </label>
        ))}
      </fieldset>
      <div className="mt-4 flex flex-col gap-1.5">
        <Label htmlFor="arquivar-nota">Nota {motivo === "outro" ? "*" : "(opcional)"}</Label>
        <Textarea
          id="arquivar-nota"
          value={nota}
          maxLength={500}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Ex.: fechou com a agência do primo"
          className="min-h-20 text-base md:text-[15px]"
        />
      </div>
    </PainelLateral>
  );
}
