import { CampoNumero } from "@/components/hub/CampoNumero";
import { SecaoPreco } from "@/components/precos/SecaoPreco";
import { Switch } from "@/components/ui/switch";
import { moeda } from "@/lib/formatar";
import type { PlanoPreco, Precos } from "@/lib/precos";

export function SecaoMensalidade({
  p,
  planos,
  mudarPlano,
  mudar,
}: {
  p: Precos;
  planos: PlanoPreco[];
  mudarPlano: (id: string, campos: Partial<PlanoPreco>) => void;
  mudar: <K extends keyof Precos>(campo: K, valor: Precos[K]) => void;
}) {
  return (
    <SecaoPreco
      id="mensalidade"
      titulo="Mensalidade"
      texto="Horas por mês para ajustes e melhorias depois do lançamento. Começa no lançamento."
      usadoEm={["Propostas", "Pedidos", "Cobranças"]}
    >
      {planos.map((pl) => {
        const porHora = pl.hours_month > 0 ? Math.round(pl.price_cents / pl.hours_month) : 0;
        return (
          <fieldset
            key={pl.id}
            className="grid gap-3 border-b border-hub-borda pb-4 last:border-b-0 sm:grid-cols-[110px_repeat(3,minmax(0,1fr))] sm:items-end"
          >
            <legend className="sr-only">Plano {pl.name}</legend>
            <span className="flex flex-col pb-1 sm:pb-2.5" aria-hidden="true">
              <span className="text-[15px] font-semibold">{pl.name}</span>
              <span
                className={`text-[13px] ${porHora < p.floor_cents ? "text-sit-risco-t" : "text-sit-ok-t"}`}
              >
                Hora sai a {moeda(porHora)}
              </span>
            </span>
            <CampoNumero
              rotulo="Horas por mês"
              sufixo="h"
              valor={pl.hours_month}
              aoMudar={(n) => mudarPlano(pl.id, { hours_month: n ?? 0 })}
            />
            <CampoNumero
              rotulo="Preço por mês"
              prefixo="R$"
              escala={100}
              casas={0}
              valor={pl.price_cents}
              aoMudar={(n) => mudarPlano(pl.id, { price_cents: n ?? 0 })}
            />
            <CampoNumero
              rotulo="Contrato mínimo"
              sufixo="meses"
              casas={0}
              valor={pl.min_months}
              aoMudar={(n) => mudarPlano(pl.id, { min_months: Math.max(1, Math.round(n ?? 1)) })}
            />
          </fieldset>
        );
      })}
      <label className="flex min-h-11 cursor-pointer items-start gap-3">
        <Switch
          checked={p.infra_at_cost}
          onCheckedChange={(v) => mudar("infra_at_cost", v)}
          className="mt-0.5"
        />
        <span className="flex flex-col">
          <span className="text-[15px] font-medium">Somar infraestrutura pelo custo</span>
          <span className="text-[13.5px] text-hub-suave">
            Hospedagem e serviços do site entram sem margem, à parte da mensalidade.
          </span>
        </span>
      </label>
    </SecaoPreco>
  );
}
