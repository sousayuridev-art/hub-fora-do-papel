import { CampoEscolha } from "@/components/hub/Campo";
import { PainelLateral } from "@/components/hub/PainelLateral";
import type { OpcoesFiltro } from "@/components/tarefas/FiltrosTarefas";
import { Button } from "@/components/ui/button";
import type { PrioridadeTarefa, SituacaoTarefa } from "@/lib/projetos";
import { opcoesPrioridade, opcoesSituacao, type BuscaTarefas } from "@/lib/tarefas";

const TODOS = "todos";

/** Filtros da Central no celular (painel de baixo). Cada escolha já vale. */
export function FiltrosPainel({
  aberto,
  aoMudarAberto,
  busca,
  opcoes,
  aoMudar,
}: {
  aberto: boolean;
  aoMudarAberto: (v: boolean) => void;
  busca: BuscaTarefas;
  opcoes: OpcoesFiltro;
  aoMudar: (p: Partial<BuscaTarefas>) => void;
}) {
  const todos = (rotulo: string) => [{ id: TODOS, rotulo }];
  const valor = (v: string | undefined) => v ?? TODOS;
  const limpo = (v: string) => (v === TODOS ? undefined : v);
  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudarAberto}
      titulo="Filtros"
      descricao="Valem na hora e ficam no endereço da página."
      rodape={
        <>
          <Button
            variant="outline"
            className="h-11"
            onClick={() =>
              aoMudar({
                cliente: undefined,
                projeto: undefined,
                prioridade: undefined,
                situacao: undefined,
                prazo: undefined,
              })
            }
          >
            Limpar filtros
          </Button>
          <Button
            className="h-11 bg-hub-tinta text-white hover:bg-hub-tinta/90"
            onClick={() => aoMudarAberto(false)}
          >
            Ver tarefas
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <CampoEscolha
          rotulo="Prazo"
          valor={valor(busca.prazo)}
          opcoes={[
            ...todos("Qualquer prazo"),
            { id: "atrasadas", rotulo: "Atrasadas" },
            { id: "hoje", rotulo: "Hoje" },
            { id: "semana", rotulo: "Esta semana" },
          ]}
          aoMudar={(v) => aoMudar({ prazo: limpo(v) as BuscaTarefas["prazo"] })}
        />
        <CampoEscolha
          rotulo="Cliente"
          valor={valor(busca.cliente)}
          opcoes={[...todos("Todos os clientes"), ...opcoes.clientes]}
          aoMudar={(v) => aoMudar({ cliente: limpo(v) })}
        />
        <CampoEscolha
          rotulo="Projeto"
          valor={valor(busca.projeto)}
          opcoes={[...todos("Todos os projetos"), ...opcoes.projetos]}
          aoMudar={(v) => aoMudar({ projeto: limpo(v) })}
        />
        <CampoEscolha
          rotulo="Prioridade"
          valor={valor(busca.prioridade)}
          opcoes={[...todos("Qualquer prioridade"), ...opcoesPrioridade]}
          aoMudar={(v) => aoMudar({ prioridade: limpo(v) as PrioridadeTarefa | undefined })}
        />
        <CampoEscolha
          rotulo="Situação"
          valor={valor(busca.situacao)}
          opcoes={[...todos("Qualquer situação"), ...opcoesSituacao]}
          aoMudar={(v) => aoMudar({ situacao: limpo(v) as SituacaoTarefa | undefined })}
        />
      </div>
    </PainelLateral>
  );
}
