import { Plus } from "lucide-react";

import { ModuloLinha, type AcaoModulo } from "@/components/projetos/ModuloLinha";
import { classeBotaoSecundario } from "@/lib/estilos";
import { diaMes } from "@/lib/formatar";
import type { DetalheProjeto, Modulo } from "@/lib/projetos";

/** Seção "Módulos" do projeto sob medida (card SS-1), no lugar das fases. */
export function ProjetoModulos({
  d,
  ocupado,
  aoNovo,
  aoAgir,
  aoVoltarParaFases,
}: {
  d: DetalheProjeto;
  ocupado: boolean;
  aoNovo: () => void;
  aoAgir: (m: Modulo, a: AcaoModulo) => void;
  aoVoltarParaFases: () => void;
}) {
  const ativos = d.modulos.filter((m) => m.situacao !== "fora_do_escopo");
  const noAr = ativos.filter((m) => m.no_ar_desde).length;
  const final = d.projeto.final_release_at;
  return (
    <section
      aria-labelledby="modulos-t"
      className="flex flex-col gap-2 rounded-2xl border border-hub-borda bg-white p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 id="modulos-t" className="font-titulo text-lg font-bold">
            Módulos
          </h2>
          <p className="text-[14px] text-hub-suave">
            {ativos.length === 0
              ? "Cadastre os módulos do sistema. Cada um vai ao ar quando ficar pronto."
              : `${noAr} de ${ativos.length} no ar`}
            {final ? ` · publicação final em ${diaMes(final)} (garantia conta daqui)` : ""}
          </p>
        </div>
        <button type="button" className={classeBotaoSecundario} onClick={aoNovo} disabled={ocupado}>
          <Plus className="size-4" aria-hidden="true" /> Novo módulo
        </button>
      </div>
      {d.modulos.length > 0 ? (
        <ul>
          {d.modulos.map((m) => (
            <ModuloLinha
              key={m.id}
              m={m}
              ocupado={ocupado || m.id.startsWith("temp-")}
              aoAgir={aoAgir}
            />
          ))}
        </ul>
      ) : (
        <button
          type="button"
          onClick={aoVoltarParaFases}
          className="self-start text-[14px] text-hub-suave underline underline-offset-4 hover:text-hub-tinta"
        >
          Este projeto não é por módulos? Voltar para fases
        </button>
      )}
    </section>
  );
}
