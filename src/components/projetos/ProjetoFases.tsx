import { Check } from "lucide-react";

import { LinhaFases } from "@/components/projetos/LinhaFases";
import { classeBotaoSecundario } from "@/lib/estilos";
import { dataLocal, diaMes } from "@/lib/formatar";
import { faseAtual, type DetalheProjeto } from "@/lib/projetos";

/** Linha de fases e a ação principal da tela: concluir a fase atual pedindo aprovação. */
export function ProjetoFases({
  d,
  aoConcluir,
  aoMudarParaModulos,
}: {
  d: DetalheProjeto;
  aoConcluir: () => void;
  /** Sistemas sob medida (SS-1): só aparece sem fase concluída. */
  aoMudarParaModulos?: () => void;
}) {
  const podeMudar =
    aoMudarParaModulos !== undefined &&
    d.projeto.status === "andamento" &&
    !d.fases.some((f) => f.status === "concluida");
  const atual = faseAtual(d.fases);
  const esperando = atual
    ? d.aprovacoes.some((a) => a.phase_id === atual.fase.id && a.status === "aguardando")
    : false;
  const lanc = d.projeto.launch_date;
  return (
    <section
      aria-labelledby="fases-t"
      className="flex flex-col gap-5 rounded-2xl border border-hub-borda bg-white p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 id="fases-t" className="font-titulo text-lg font-bold">
            Fases
          </h2>
          <p className="text-[14px] text-hub-suave">
            {lanc ? `Lançamento em ${diaMes(dataLocal(lanc))}` : "Sem data de lançamento"}
            {esperando ? " · fase atual esperando a aprovação do cliente" : ""}
          </p>
        </div>
        {atual && !esperando && d.projeto.status === "andamento" && (
          // RD-10: o âmbar fica no bloco "O que destrava o projeto" (ação principal única da tela).
          <button type="button" className={classeBotaoSecundario} onClick={aoConcluir}>
            <Check className="size-4" aria-hidden="true" /> Concluir fase e pedir aprovação
          </button>
        )}
      </div>
      <LinhaFases
        fases={d.fases.map((f) => ({
          id: f.id,
          nome: f.name,
          quando: f.due_label,
          status: f.status,
          concluida_em: f.completed_at,
        }))}
      />
      {podeMudar && (
        <button
          type="button"
          onClick={aoMudarParaModulos}
          className="self-start text-[14px] text-hub-suave underline underline-offset-4 hover:text-hub-tinta"
        >
          Sistema sob medida? Entregar por módulos
        </button>
      )}
    </section>
  );
}
