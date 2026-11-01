import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PainelLateral } from "@/components/hub/PainelLateral";
import { chavesProjetos, definirPrazoFase, type DetalheProjeto } from "@/lib/projetos";
import { erro, mensagemDeErro } from "@/lib/notify";

/**
 * Prazos das fases (RD2-4): uma data por fase. Salva ao escolher a data, com volta no erro.
 * Com a data, a página mostra "Prazo 25/10 · 3 dias de atraso" na fase.
 */
export function PrazosFasesPainel({
  d,
  aberto,
  aoMudar,
}: {
  d: DetalheProjeto;
  aberto: boolean;
  aoMudar: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const chave = chavesProjetos.detalhe(d.projeto.id);
  const salvar = useMutation({
    mutationFn: (v: { fase: string; data: string | null }) => definirPrazoFase(v.fase, v.data),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: chave });
      const antes = qc.getQueryData<DetalheProjeto>(chave);
      if (antes)
        qc.setQueryData<DetalheProjeto>(chave, {
          ...antes,
          fases: antes.fases.map((f) => (f.id === v.fase ? { ...f, due_date: v.data } : f)),
        });
      return { antes };
    },
    onError: (e, v, ctx) => {
      if (ctx?.antes) qc.setQueryData(chave, ctx.antes);
      erro(`Não foi possível salvar o prazo. ${mensagemDeErro(e)}`, {
        tentarDeNovo: () => salvar.mutate(v),
      });
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: chave }),
  });

  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Prazos das fases"
      descricao="A data de cada fase mostra o atraso na página do projeto. Salva ao escolher."
    >
      <ul className="flex flex-col gap-4">
        {d.fases.map((f) => (
          <li key={f.id} className="flex flex-col gap-1.5">
            <label htmlFor={`prazo-${f.id}`} className="text-[14px] font-medium">
              {f.position}. {f.name}
              {f.status === "concluida" && (
                <span className="font-normal text-hub-suave"> · concluída</span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                id={`prazo-${f.id}`}
                type="date"
                value={f.due_date ?? ""}
                onChange={(e) => salvar.mutate({ fase: f.id, data: e.target.value || null })}
                className="h-11 min-w-0 flex-1 rounded-xl border border-[#D9DEE5] bg-white px-3 text-base outline-none focus:border-hub-tinta md:text-[15px]"
              />
              {f.due_date && (
                <button
                  type="button"
                  onClick={() => salvar.mutate({ fase: f.id, data: null })}
                  className="h-11 shrink-0 rounded-xl px-3 text-[14px] text-hub-suave hover:bg-hub-selecao hover:text-hub-tinta"
                >
                  Tirar
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </PainelLateral>
  );
}
