import { rotuloAtividade } from "@/lib/clientes";
import { diaMes } from "@/lib/formatar";
import type { ItemLinhaDoTempo } from "@/lib/funil";
import { classeAcaoTexto } from "@/lib/estilos";

/** Últimas 4 atividades no Resumo (RD2-5); o resto fica na aba Linha do tempo. */
export function ClienteAtividades({
  itens,
  aoVerTudo,
}: {
  itens: ItemLinhaDoTempo[] | undefined;
  aoVerTudo: () => void;
}) {
  if (!itens || itens.length === 0) return null;
  return (
    <section
      aria-labelledby="ativ-t"
      className="flex flex-col gap-3 rounded-2xl border border-[#E3E7ED] bg-white p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="ativ-t" className="text-[15.5px] font-semibold">
          Últimas atividades
        </h2>
        <button type="button" className={classeAcaoTexto} onClick={aoVerTudo}>
          Linha do tempo completa ⌄
        </button>
      </div>
      <ul className="flex flex-col">
        {itens.slice(0, 4).map((i, n) => (
          <li
            key={`${i.quando}-${n}`}
            className="flex items-baseline justify-between gap-3 border-t border-[#EEF1F5] py-2.5 text-[14px] first:border-t-0 first:pt-0"
          >
            <span className="flex min-w-0 items-baseline gap-2.5">
              <i aria-hidden="true" className="size-2 shrink-0 rounded-full bg-[#C9D0DA]" />
              <span className="min-w-0 truncate">
                {i.tipo === "anotacao" ? `Anotação: ${i.texto ?? ""}` : rotuloAtividade(i.kind)}
              </span>
            </span>
            <span className="shrink-0 text-[13px] text-hub-suave">{diaMes(i.quando)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
