import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { centavosDoTexto } from "@/lib/formatar";
import { CampoEscolha } from "@/components/hub/Campo";
import {
  frentes,
  type CamposOportunidade,
  type Diagnostico,
  type Frente,
  type Oportunidade,
} from "@/lib/funil";
import { cn } from "@/lib/utils";

const opcoes: { id: Diagnostico | null; rotulo: string; detalhe: string }[] = [
  { id: null, rotulo: "Sem diagnóstico", detalhe: "Projeto pequeno ou já mapeado" },
  { id: "essencial", rotulo: "Diagnóstico essencial", detalhe: "Cerca de 7 h" },
  { id: "ampliado", rotulo: "Diagnóstico ampliado", detalhe: "Cerca de 15 h" },
];

/** Valor estimado e diagnóstico (tipo e se já foi pago). */
export function ValorDiagnosticoPainel({
  o,
  aoFechar,
  aoSalvar,
}: {
  o: Oportunidade | null;
  aoFechar: () => void;
  aoSalvar: (o: Oportunidade, campos: CamposOportunidade) => void;
}) {
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState<Diagnostico | null>(null);
  const [pago, setPago] = useState(false);
  const [frente, setFrente] = useState<Frente | "">("");
  useEffect(() => {
    setFrente(o?.frente ?? "");
    setValor(o?.value_cents != null ? String(o.value_cents / 100) : "");
    setTipo(o?.diagnostic_tier ?? null);
    setPago(o?.diagnostic_paid ?? false);
  }, [o]);

  return (
    <PainelLateral
      aberto={o !== null}
      aoMudar={(v) => !v && aoFechar()}
      titulo="Frente, valor e diagnóstico"
      descricao={o?.company_name}
      rodape={
        <>
          <Button variant="outline" className="h-11" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button
            className="h-11 bg-[#FFB020] text-hub-tinta hover:bg-[#F5A50F]"
            onClick={() => {
              if (!o) return;
              aoSalvar(o, {
                valor_cents: centavosDoTexto(valor),
                diagnostico: tipo,
                diagnostico_pago: tipo ? pago : false,
                frente,
              });
              aoFechar();
            }}
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <CampoEscolha<Frente | "">
          rotulo="Frente"
          valor={frente}
          aoMudar={setFrente}
          opcoes={[{ id: "", rotulo: "Ainda não definida" }, ...frentes]}
          ajuda="Vem do assunto escolhido no site. Serve para os relatórios por frente."
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vd-valor">Valor (R$)</Label>
          <Input
            id="vd-valor"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Ex.: 4500"
            className="h-11"
          />
          <p className="text-[13px] text-hub-suave">
            Diagnóstico: o valor dele. Proposta: o valor do projeto.
          </p>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-medium">Diagnóstico</legend>
          {opcoes.map((op) => (
            <label
              key={op.rotulo}
              className={cn(
                "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4",
                tipo === op.id ? "border-hub-tinta bg-hub-selecao" : "border-hub-borda bg-white",
              )}
            >
              <input
                type="radio"
                name="diag"
                checked={tipo === op.id}
                onChange={() => setTipo(op.id)}
                className="size-4 accent-[#0E1013]"
              />
              <span className="flex flex-col">
                <span className="text-[15px]">{op.rotulo}</span>
                <span className="text-[13px] text-hub-suave">{op.detalhe}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {tipo && (
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-hub-borda bg-white px-4 text-[15px]">
            <input
              type="checkbox"
              checked={pago}
              onChange={(e) => setPago(e.target.checked)}
              className="size-4 accent-[#145A37]"
            />
            Diagnóstico já foi pago
          </label>
        )}
      </div>
    </PainelLateral>
  );
}
