import { CampoNumero } from "@/components/hub/CampoNumero";
import { SecaoPreco } from "@/components/precos/SecaoPreco";
import type { PropsSecao } from "@/components/precos/tipos";
import { Switch } from "@/components/ui/switch";

export function SecaoDiagnostico({ p, mudar }: PropsSecao) {
  const desconta = p.diag_credit_days > 0;
  return (
    <SecaoPreco
      id="diagnostico"
      titulo="Diagnóstico"
      texto="O primeiro passo pago. Vira crédito no projeto quando o cliente contrata dentro do prazo."
      usadoEm={["Funil", "Propostas"]}
    >
      {(
        [
          ["Essencial", "diag_essencial_cents", "diag_essencial_hours"],
          ["Ampliado", "diag_ampliado_cents", "diag_ampliado_hours"],
        ] as const
      ).map(([nome, preco, horas]) => (
        <fieldset
          key={nome}
          className="grid gap-3 sm:grid-cols-[110px_repeat(2,minmax(0,1fr))] sm:items-end"
        >
          <legend className="sr-only">Diagnóstico {nome}</legend>
          <span className="pb-2.5 text-[15px] font-semibold" aria-hidden="true">
            {nome}
          </span>
          <CampoNumero
            rotulo={`Preço do ${nome.toLowerCase()}`}
            prefixo="R$"
            escala={100}
            casas={0}
            valor={p[preco]}
            aoMudar={(n) => mudar(preco, n ?? 0)}
          />
          <CampoNumero
            rotulo="Horas, cerca de"
            sufixo="h"
            valor={p[horas]}
            aoMudar={(n) => mudar(horas, n ?? 0)}
          />
        </fieldset>
      ))}
      <label className="flex min-h-11 cursor-pointer items-start gap-3 border-t border-hub-borda pt-4">
        <Switch
          checked={desconta}
          onCheckedChange={(v) => mudar("diag_credit_days", v ? 30 : 0)}
          className="mt-0.5"
        />
        <span className="flex flex-col">
          <span className="text-[15px] font-medium">
            Descontar do projeto se contratado em até {desconta ? p.diag_credit_days : 30} dias
          </span>
          <span className="text-[13.5px] text-hub-suave">
            O valor do diagnóstico sai do total da proposta sozinho.
          </span>
        </span>
      </label>
      {desconta && (
        <CampoNumero
          className="sm:max-w-[220px]"
          rotulo="Prazo para descontar"
          sufixo="dias"
          casas={0}
          valor={p.diag_credit_days}
          aoMudar={(n) => mudar("diag_credit_days", Math.max(1, Math.round(n ?? 30)))}
        />
      )}
    </SecaoPreco>
  );
}
