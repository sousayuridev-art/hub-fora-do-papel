import { CampoNumero } from "@/components/hub/CampoNumero";
import { BlocoEditor } from "@/components/propostas/BlocoEditor";
import type { PropsBloco } from "@/components/propostas/tipos";
import { moeda } from "@/lib/formatar";
import type { Plano } from "@/lib/propostas";
import { cn } from "@/lib/utils";

/** Mensalidade depois do lançamento: um dos planos de Configurações › Preços. */
export function BlocoMensalidade({
  d,
  alterar,
  bloqueado,
  planos,
}: PropsBloco & { planos: Plano[] }) {
  return (
    <BlocoEditor
      id="mensalidade"
      titulo="Mensalidade depois do lançamento"
      texto="Começa no lançamento. Infraestrutura entra pelo custo, sem margem."
    >
      <div
        role="radiogroup"
        aria-label="Plano de mensalidade"
        className="grid gap-2 sm:grid-cols-3"
      >
        {planos.map((pl) => {
          const marcado = d.plano_id === pl.id;
          return (
            <button
              key={pl.id}
              type="button"
              role="radio"
              aria-checked={marcado}
              disabled={bloqueado}
              onClick={() => alterar({ plano_id: marcado ? null : pl.id })}
              className={cn(
                "flex min-h-11 flex-col items-start gap-1 rounded-xl border p-4 text-left transition-colors",
                marcado
                  ? "border-hub-tinta bg-hub-selecao ring-1 ring-hub-tinta"
                  : "border-hub-borda bg-white hover:border-[#C9C9C2]",
              )}
            >
              <span className="flex items-center gap-2 text-[15px] font-semibold">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-4 rounded-full border-2",
                    marcado
                      ? "border-hub-tinta bg-hub-tinta shadow-[inset_0_0_0_3px_#fff]"
                      : "border-[#C9C9C2]",
                  )}
                />
                {pl.nome}
              </span>
              <span className="font-titulo text-xl font-bold tabular-nums">
                {moeda(pl.cents)}
                <span className="text-[13px] font-normal text-hub-suave"> /mês</span>
              </span>
              <span className="text-[13px] text-hub-suave">
                {pl.horas_mes.toLocaleString("pt-BR")} h por mês · mínimo de {pl.minimo_meses} meses
              </span>
            </button>
          );
        })}
      </div>
      <CampoNumero
        className="sm:max-w-[280px]"
        rotulo="Infraestrutura por mês (custo)"
        prefixo="R$"
        escala={100}
        casas={2}
        bloqueado={bloqueado}
        placeholder="Ex.: 45"
        valor={d.infra_cents}
        aoMudar={(n) => alterar({ infra_cents: n })}
        ajuda="Hospedagem e serviços do site. Deixe em branco se ainda não souber."
      />
    </BlocoEditor>
  );
}
