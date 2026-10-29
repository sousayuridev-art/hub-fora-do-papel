import { Selo, type Tom } from "@/components/hub/Selo";
import { dataLocal, diaMes } from "@/lib/formatar";
import {
  rotuloFrente,
  rotuloFunil,
  rotuloObjetivo,
  rotuloSituacaoCampanha,
  type Campanha,
  type SituacaoCampanha,
} from "@/lib/marketing";

const tomDa: Record<SituacaoCampanha, Tom> = {
  planejada: "neutro",
  ativa: "info",
  encerrada: "ok",
};

/** Campanhas com período, objetivo e quantas peças há em cada coluna (contas do banco). */
export function CampanhasLista({
  itens,
  aoEditar,
  aoVerPecas,
}: {
  itens: Campanha[];
  aoEditar: (c: Campanha) => void;
  aoVerPecas: (c: Campanha) => void;
}) {
  if (itens.length === 0)
    return (
      <p className="rounded-2xl border border-dashed border-[#D6D6CF] p-6 text-center text-[14.5px] text-hub-suave">
        Nenhuma campanha ainda. Crie uma para juntar peças com o mesmo objetivo.
      </p>
    );
  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {itens.map((c) => (
        <li
          key={c.id}
          className="flex flex-col gap-3 rounded-2xl border border-hub-borda bg-white p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <b className="text-[16px] font-semibold">{c.name}</b>
              <span className="text-[13px] text-hub-suave">
                {c.starts_on ? diaMes(dataLocal(c.starts_on)) : "Sem início"} →{" "}
                {c.ends_on ? diaMes(dataLocal(c.ends_on)) : "sem fim"}
              </span>
            </div>
            <Selo tom={tomDa[c.status]}>{rotuloSituacaoCampanha[c.status]}</Selo>
          </div>
          <p className="text-[14px] text-[#4A4D54]">
            {[
              c.objective && rotuloObjetivo[c.objective],
              c.funnel && rotuloFunil[c.funnel],
              c.front && rotuloFrente[c.front],
            ]
              .filter(Boolean)
              .join(" · ") || "Objetivo ainda não definido"}
          </p>
          <dl className="grid grid-cols-5 gap-1 text-center">
            {(
              [
                ["Plan.", c.pecas.planejamento],
                ["Criação", c.pecas.criacao],
                ["Aprov.", c.pecas.aprovacao],
                ["Pronto", c.pecas.pronto],
                ["Public.", c.pecas.publicado],
              ] as const
            ).map(([r, n]) => (
              <div key={r} className="rounded-lg bg-[#F1F1EC] px-1 py-1.5">
                <dd className="text-[15px] font-semibold tabular-nums">{n}</dd>
                <dt className="text-[12.5px] text-hub-suave">{r}</dt>
              </div>
            ))}
          </dl>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => aoVerPecas(c)}
              className="inline-flex min-h-11 items-center rounded-lg px-2 text-[14px] font-medium text-[#1E3FA8] hover:bg-hub-fundo"
            >
              Ver as {c.pecas.total} peças
            </button>
            <button
              type="button"
              onClick={() => aoEditar(c)}
              className="inline-flex min-h-11 items-center rounded-lg px-2 text-[14px] font-medium text-[#4A4D54] hover:bg-hub-fundo"
            >
              Editar
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
