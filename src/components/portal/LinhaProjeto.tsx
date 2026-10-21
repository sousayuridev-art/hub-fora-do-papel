import { Check } from "lucide-react";

import { dataLocal, diaMes } from "@/lib/formatar";
import type { SituacaoFase } from "@/lib/projetos";
import { cn } from "@/lib/utils";

type Fase = {
  nome: string;
  quando: string | null;
  status: SituacaoFase;
  concluida_em: string | null;
  /** Texto pronto da situação (módulos, card SS-1). */
  legenda?: string;
};

/**
 * Marco de uma etapa no símbolo da marca (card CX-5): concluída = quadrado cheio com ✓,
 * atual = o símbolo (papel em contorno + quadrado âmbar saindo dele), próxima = só o contorno.
 */
function Marco({ status, pequeno }: { status: SituacaoFase; pequeno: boolean }) {
  const lado = pequeno ? "size-[30px]" : "size-9";
  if (status === "concluida")
    return (
      <span
        className={cn(lado, "flex shrink-0 items-center justify-center rounded-[3px] bg-[#F5F5F2]")}
      >
        <Check className="size-4 text-hub-tinta" strokeWidth={3} aria-hidden="true" />
      </span>
    );
  if (status === "andamento")
    return (
      <span
        className={cn("relative shrink-0", pequeno ? "size-[34px]" : "size-10")}
        aria-hidden="true"
      >
        <span
          className={cn(
            "absolute bottom-0 left-0 rounded-[3px] border-[2.5px] border-[#F5F5F2]",
            pequeno ? "size-6" : "size-7",
          )}
        />
        <span
          className={cn(
            "absolute right-0 top-0 rounded-[3px] bg-[#FFB020] shadow-[0_6px_18px_rgba(255,176,32,0.55)]",
            pequeno ? "size-5" : "size-6",
          )}
        />
      </span>
    );
  return (
    <span
      className={cn(lado, "shrink-0 rounded-[3px] border-2 border-[#F5F5F2]/30")}
      aria-hidden="true"
    />
  );
}

function legenda(f: Fase): string {
  if (f.legenda) return f.legenda;
  if (f.status === "concluida")
    return f.concluida_em ? `Concluída em ${diaMes(f.concluida_em)}` : "Concluída";
  if (f.status === "andamento") return "Em andamento";
  return f.quando ?? "Próxima";
}

/** Linha do projeto sobre a capa escura. No celular, só os marcos e a etapa atual por extenso. */
export function LinhaProjeto({
  fases,
  lancamento,
  rotuloEtapa = "Etapa",
}: {
  fases: Fase[];
  lancamento: string | null;
  /** "Etapa" (fases) ou "Módulo" (sistemas sob medida). */
  rotuloEtapa?: string;
}) {
  const atualIdx = Math.max(
    0,
    fases.findIndex((f) => f.status === "andamento"),
  );
  const atual = fases[atualIdx];
  const tracos = (i: number) =>
    fases[i]?.status === "concluida"
      ? "bg-[#F5F5F2]"
      : fases[i]?.status === "andamento"
        ? "bg-[linear-gradient(90deg,#F5F5F2_50%,rgb(245_245_242/0.2)_50%)]"
        : "bg-[#F5F5F2]/20";

  return (
    <div className="flex flex-col gap-4">
      {/* Computador: marcos com nome e situação */}
      <ol
        aria-label={rotuloEtapa === "Módulo" ? "Módulos do projeto" : "Etapas do projeto"}
        className="grid grid-flow-col auto-cols-fr max-md:hidden"
      >
        {fases.map((f, i) => (
          <li
            key={`${f.nome}-${i}`}
            className="flex flex-col gap-3"
            aria-current={f.status === "andamento" ? "step" : undefined}
          >
            <span className="flex items-center">
              <Marco status={f.status} pequeno={false} />
              {i < fases.length - 1 && <i className={cn("mx-2 h-0.5 flex-1", tracos(i))} />}
            </span>
            <span className="flex flex-col gap-0.5 pr-3">
              <b
                className={cn(
                  "text-[14.5px] font-semibold",
                  f.status === "pendente" && "text-[#D5D7DC]",
                )}
              >
                {f.nome}
              </b>
              <span
                className={cn(
                  "text-[13px]",
                  f.status === "andamento" ? "text-[#FFB020]" : "text-[#A3A6AD]",
                )}
              >
                {legenda(f)}
              </span>
            </span>
          </li>
        ))}
      </ol>

      {/* Celular: só os marcos ligados, e a etapa atual por extenso */}
      <div className="flex flex-col gap-3 md:hidden">
        <span className="flex items-center gap-1.5" aria-hidden="true">
          {fases.map((f, i) => (
            <span key={`${f.nome}-${i}`} className="contents">
              <Marco status={f.status} pequeno />
              {i < fases.length - 1 && <i className={cn("h-0.5 flex-1", tracos(i))} />}
            </span>
          ))}
        </span>
        {atual && (
          <span className="flex items-baseline justify-between gap-3">
            <span className="flex flex-col leading-snug">
              <b className="text-[15px] font-semibold">{atual.nome}</b>
              <span className="text-[13px] text-[#FFB020]">
                {rotuloEtapa} {atualIdx + 1} de {fases.length}
                {atual.legenda
                  ? `: ${atual.legenda.toLowerCase()}`
                  : atual.status === "andamento"
                    ? ", em andamento"
                    : ""}
              </span>
            </span>
            {lancamento && (
              <span className="text-right text-[13px] leading-snug text-[#C9CBD0]">
                No ar em
                <br />
                <b className="font-semibold text-[#F5F5F2]">{diaMes(dataLocal(lancamento))}</b>
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
