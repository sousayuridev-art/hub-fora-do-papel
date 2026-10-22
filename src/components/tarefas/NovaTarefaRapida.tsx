import { useEffect, useId, useState } from "react";
import { CalendarDays, ChevronDown, FolderKanban, Plus } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { somarDias, type NovaTarefa, type ProjetoOpcao } from "@/lib/tarefas";

const INTERNA = "__interna__";
const HUB = "__hub__";
const SEM_PRAZO = "__sem__";

const classeEscolha =
  "inline-flex h-10 max-w-[240px] shrink-0 items-center gap-1.5 rounded-lg border border-hub-borda bg-[#FAFAF7] px-3 text-[14px] text-hub-tinta hover:bg-hub-selecao";

/**
 * Nova tarefa rápida (TA-3): título + Enter. Projeto é opcional; sem projeto vira Interna
 * (ou Hub). O prazo pode ficar para depois, no painel da tarefa.
 */
export function NovaTarefaRapida({
  hoje,
  projetos,
  projetoPadrao,
  tipoPadrao,
  aoCriar,
}: {
  hoje: string;
  projetos: ProjetoOpcao[];
  projetoPadrao?: string | undefined;
  tipoPadrao?: "interna" | "hub" | undefined;
  aoCriar: (v: NovaTarefa, projeto: ProjetoOpcao | null) => void;
}) {
  const id = useId();
  const [titulo, setTitulo] = useState("");
  const padrao = projetoPadrao ?? (tipoPadrao === "hub" ? HUB : INTERNA);
  const [destino, setDestino] = useState(padrao);
  const [prazo, setPrazo] = useState<string>(SEM_PRAZO);
  useEffect(() => setDestino(padrao), [padrao]);

  const projeto = projetos.find((p) => p.id === destino) ?? null;
  const rotuloDestino = projeto
    ? `${projeto.empresa} › ${projeto.nome}`
    : destino === HUB
      ? "Sem projeto (Hub)"
      : "Sem projeto (interna)";
  const prazos = [
    { id: SEM_PRAZO, rotulo: "Sem prazo" },
    { id: hoje, rotulo: "Hoje" },
    { id: somarDias(hoje, 1), rotulo: "Amanhã" },
    { id: somarDias(hoje, 7), rotulo: "Daqui a 7 dias" },
  ];
  const rotuloPrazo = prazos.find((p) => p.id === prazo)?.rotulo ?? "Sem prazo";

  function enviar() {
    const t = titulo.trim();
    if (t.length < 2) return;
    aoCriar(
      {
        titulo: t,
        projetoId: projeto?.id ?? null,
        tipo: projeto ? "cliente" : destino === HUB ? "hub" : "interna",
        prazo: prazo === SEM_PRAZO ? null : prazo,
      },
      projeto,
    );
    setTitulo("");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        enviar();
      }}
      className="flex flex-col gap-2 rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-2 md:flex-row md:items-center md:pl-4"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Plus className="size-[18px] shrink-0 text-hub-suave max-md:ml-2" aria-hidden="true" />
        <label htmlFor={id} className="sr-only">
          Nova tarefa
        </label>
        <input
          id={id}
          value={titulo}
          maxLength={120}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Nova tarefa… Enter para salvar"
          autoComplete="off"
          enterKeyHint="done"
          className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#7A7D84] md:text-[15px]"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger className={classeEscolha} aria-label={`Projeto: ${rotuloDestino}`}>
            <FolderKanban className="size-3.5 shrink-0 text-hub-suave" aria-hidden="true" />
            <span className="truncate">{rotuloDestino}</span>
            <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
            <DropdownMenuRadioGroup value={destino} onValueChange={setDestino}>
              <DropdownMenuRadioItem value={INTERNA} className="min-h-11">
                Sem projeto (interna)
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value={HUB} className="min-h-11">
                Sem projeto (Hub)
              </DropdownMenuRadioItem>
              {projetos.length > 0 && <DropdownMenuSeparator />}
              {projetos.map((p) => (
                <DropdownMenuRadioItem key={p.id} value={p.id} className="min-h-11">
                  {p.empresa} › {p.nome}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger className={classeEscolha} aria-label={`Prazo: ${rotuloPrazo}`}>
            <CalendarDays className="size-3.5 shrink-0 text-hub-suave" aria-hidden="true" />
            {rotuloPrazo}
            <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={prazo} onValueChange={setPrazo}>
              {prazos.map((p) => (
                <DropdownMenuRadioItem key={p.rotulo} value={p.id} className="min-h-11">
                  {p.rotulo}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="submit"
          disabled={titulo.trim().length < 2}
          className="inline-flex h-10 items-center rounded-lg bg-hub-tinta px-3.5 text-[14px] font-medium text-white disabled:opacity-40 max-md:h-11 max-md:flex-1 max-md:justify-center"
        >
          Salvar
        </button>
      </div>
    </form>
  );
}
