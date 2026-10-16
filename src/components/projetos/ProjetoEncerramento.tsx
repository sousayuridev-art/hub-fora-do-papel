import { useState } from "react";
import { Plus, Rocket } from "lucide-react";

import { CampoTexto } from "@/components/hub/Campo";
import { Checkbox } from "@/components/ui/checkbox";
import { classeAcaoPrincipal, classeBotaoSecundario } from "@/lib/estilos";
import { dataLocal, diaMes } from "@/lib/formatar";
import type { DetalheProjeto } from "@/lib/projetos";

/** Checklist de lançamento, data prevista e "Lançar projeto" (só libera com tudo marcado). */
export function ProjetoEncerramento({
  d,
  aoMarcar,
  aoIncluir,
  aoLancar,
  aoMudarData,
}: {
  d: DetalheProjeto;
  aoMarcar: (id: string, feito: boolean) => void;
  aoIncluir: (titulo: string) => void;
  aoLancar: () => void;
  aoMudarData: (data: string | null) => void;
}) {
  const [novo, setNovo] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const feitos = d.checklist.filter((i) => i.done).length;
  const completo = feitos === d.checklist.length && d.checklist.length > 0;
  const lancado = d.projeto.status !== "andamento";
  const destino = d.projeto.plan_name ? `mensalidade ${d.projeto.plan_name}` : "concluído";

  return (
    <section
      aria-labelledby="encerramento-t"
      className="flex flex-col gap-5 rounded-2xl border border-hub-borda bg-white p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="encerramento-t" className="font-titulo text-lg font-bold">
          Encerramento
        </h2>
        <p className="text-[14px] text-hub-suave">
          {lancado
            ? `Lançado em ${d.projeto.launched_at ? diaMes(d.projeto.launched_at) : "—"}.`
            : `Checklist ${feitos} de ${d.checklist.length}. Ao lançar, todas as fases fecham e o projeto vai para ${destino}.`}
        </p>
      </div>

      {!lancado && (
        <div className="max-w-xs">
          <CampoTexto
            rotulo="Lançamento previsto"
            tipo="date"
            valor={d.projeto.launch_date ?? ""}
            aoMudar={(v) => aoMudarData(v || null)}
            ajuda={d.projeto.launch_date ? `Hoje: ${diaMes(dataLocal(d.hoje))}` : undefined}
          />
        </div>
      )}

      <ul className="flex flex-col">
        {d.checklist.map((i) => (
          <li key={i.id} className="border-t border-hub-borda first:border-t-0">
            <label className="flex min-h-12 cursor-pointer items-center gap-3 py-2">
              <Checkbox
                checked={i.done}
                disabled={lancado}
                onCheckedChange={(v) => aoMarcar(i.id, v === true)}
                className="size-5"
              />
              <span className={i.done ? "text-hub-suave line-through" : ""}>{i.title}</span>
            </label>
          </li>
        ))}
      </ul>

      {!lancado && (
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (novo.trim().length < 2) return;
            aoIncluir(novo.trim());
            setNovo("");
          }}
        >
          <CampoTexto
            className="flex-1"
            rotulo="Incluir item"
            valor={novo}
            aoMudar={setNovo}
            maxLength={120}
            placeholder="Ex.: Apontar o e-mail profissional"
          />
          <button type="submit" className={classeBotaoSecundario} disabled={novo.trim().length < 2}>
            <Plus className="size-4" aria-hidden="true" /> Incluir
          </button>
        </form>
      )}

      {!lancado &&
        (confirmar ? (
          <div className="flex flex-col gap-3 rounded-xl bg-sit-atencao p-4 text-sit-atencao-t">
            <p className="text-[14.5px]">
              Lançar agora? Todas as fases ficam concluídas e o projeto vai para {destino}. O
              cliente vê no portal.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className={classeAcaoPrincipal}
                onClick={() => {
                  aoLancar();
                  setConfirmar(false);
                }}
              >
                <Rocket className="size-4" aria-hidden="true" /> Sim, lançar projeto
              </button>
              <button
                type="button"
                className={classeBotaoSecundario}
                onClick={() => setConfirmar(false)}
              >
                Ainda não
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              className={classeAcaoPrincipal}
              disabled={!completo}
              aria-disabled={!completo}
              onClick={() => setConfirmar(true)}
            >
              <Rocket className="size-4" aria-hidden="true" /> Lançar projeto
            </button>
            {!completo && (
              <span className="text-[14px] text-hub-suave">
                Faltam {d.checklist.length - feitos}{" "}
                {d.checklist.length - feitos === 1 ? "item" : "itens"} do checklist.
              </span>
            )}
          </div>
        ))}
    </section>
  );
}
