import { BlocoEditor } from "@/components/propostas/BlocoEditor";
import { diaMes, moeda } from "@/lib/formatar";
import type { Calculo } from "@/lib/propostas";

/** Pagamento e validade: só leitura, vem da conta do banco e de Configurações. */
export function BlocoPagamento({
  c,
  validadeDias,
  venceEm,
}: {
  c: Calculo;
  validadeDias: number;
  venceEm: string | null;
}) {
  const hoje = new Date();
  const fim = venceEm ? new Date(venceEm) : new Date(hoje.getTime() + validadeDias * 86400000);
  return (
    <BlocoEditor
      id="pagamento"
      titulo="Pagamento e validade"
      texto={`${c.parcelas.length} partes: ${c.parcelas.map((p) => `${p.pct}%`).join(" · ")}. Regras em Configurações › Preços.`}
    >
      <ul className="grid gap-2 sm:grid-cols-3">
        {c.parcelas.map((p, i) => (
          <li key={i} className="flex flex-col gap-0.5 rounded-xl bg-hub-fundo px-4 py-3">
            <span className="text-[13px] text-hub-suave">
              {p.pct}% · {p.quando}
            </span>
            <span className="font-semibold tabular-nums">{moeda(p.cents)}</span>
          </li>
        ))}
      </ul>
      <p className="text-[14px] text-hub-suave">
        Validade de {validadeDias} dias: {venceEm ? "vale" : "se enviada hoje, vale"} até{" "}
        {diaMes(fim)}.
      </p>
    </BlocoEditor>
  );
}
