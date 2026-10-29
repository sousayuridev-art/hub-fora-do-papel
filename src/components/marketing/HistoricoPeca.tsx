import { diaComHora } from "@/lib/formatar";
import { rotuloEtapa, type EventoPeca } from "@/lib/marketing";

function frase(e: EventoPeca): string {
  switch (e.tipo) {
    case "criada":
      return "Peça criada";
    case "etapa":
      return `Etapa: ${e.de ? rotuloEtapa[e.de] : "—"} → ${e.para ? rotuloEtapa[e.para] : "—"}`;
    case "aprovada":
      return "Aprovada";
    case "ajuste_pedido":
      return "Ajuste pedido";
    case "reaberta":
      return `Voltou para ${e.para ? rotuloEtapa[e.para] : "a produção"}`;
    case "versao_adicionada":
      return "Versão adicionada";
    case "versao_removida":
      return "Versão removida";
    case "agendada":
      return "Agenda";
    case "publicada":
      return "Publicada";
    case "resultados":
      return "Resultados registrados";
  }
}

/** Histórico da peça (aprovação, ajustes, agenda e publicação), do mais novo para o mais antigo. */
export function HistoricoPeca({ itens }: { itens: EventoPeca[] }) {
  if (itens.length === 0) return <p className="text-[14.5px] text-hub-suave">Sem registros.</p>;
  return (
    <ol className="flex flex-col">
      {itens.map((e) => (
        <li key={e.id} className="flex gap-3 border-l border-hub-borda pb-4 pl-4 last:pb-0">
          <span
            aria-hidden="true"
            className={
              e.tipo === "aprovada" || e.tipo === "publicada"
                ? "-ml-[21px] mt-1.5 size-2.5 shrink-0 rounded-sm bg-sit-ok-t"
                : e.tipo === "ajuste_pedido" || e.tipo === "reaberta"
                  ? "-ml-[21px] mt-1.5 size-2.5 shrink-0 rounded-sm bg-[#D48A00]"
                  : "-ml-[21px] mt-1.5 size-2.5 shrink-0 rounded-sm border border-[#B9B9B2] bg-white"
            }
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <b className="text-[14.5px] font-semibold">{frase(e)}</b>
            {e.nota && <p className="whitespace-pre-line text-[14px] text-[#4A4D54]">{e.nota}</p>}
            <span className="text-[12.5px] text-hub-suave">{diaComHora(e.quando)}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
