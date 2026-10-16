import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

import { BotoesPainel } from "@/components/hub/BotoesPainel";
import { CampoArea, CampoEscolha, CampoTexto } from "@/components/hub/Campo";
import { PainelLateral } from "@/components/hub/PainelLateral";
import type { Fase } from "@/lib/projetos";

export type AprovacaoNova = {
  titulo: string;
  descricao: string;
  itens: string[];
  previa: string;
  faseId: string | null;
};

/**
 * Enviar uma entrega para o cliente aprovar no portal. Se ligada à fase,
 * a fase só conclui quando ele aprovar. Opção de concluir fase interna sem pedir aprovação.
 */
export function PedirAprovacaoPainel({
  aberto,
  aoMudar,
  fases,
  faseInicial,
  aoEnviar,
  aoConcluirSemAprovacao,
}: {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  fases: Fase[];
  faseInicial: string | null;
  aoEnviar: (v: AprovacaoNova) => void;
  aoConcluirSemAprovacao: (faseId: string) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [itens, setItens] = useState<string[]>([""]);
  const [previa, setPrevia] = useState("");
  const [fase, setFase] = useState<string>("");

  useEffect(() => {
    if (!aberto) return;
    const f = fases.find((x) => x.id === faseInicial);
    setTitulo(f ? `Entrega da fase ${f.name}` : "");
    setDescricao("");
    setItens([""]);
    setPrevia("");
    setFase(faseInicial ?? "");
  }, [aberto, faseInicial, fases]);

  const previaOk = previa.trim() === "" || /^https:\/\/\S{3,}$/.test(previa.trim());
  const valido = titulo.trim().length >= 2 && previaOk;
  const abertas = fases.filter((f) => f.status !== "concluida");

  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Pedir aprovação"
      descricao="O cliente vê no portal e aprova ou pede ajuste. Nada é aprovado sozinho."
      rodape={
        <BotoesPainel
          rotulo="Enviar para o cliente"
          desabilitado={!valido}
          aoCancelar={() => aoMudar(false)}
          aoConfirmar={() => {
            aoEnviar({
              titulo: titulo.trim(),
              descricao: descricao.trim(),
              itens: itens.map((i) => i.trim()).filter(Boolean),
              previa: previa.trim(),
              faseId: fase || null,
            });
            aoMudar(false);
          }}
        />
      }
    >
      <div className="flex flex-col gap-4">
        <CampoTexto
          rotulo="O que o cliente vai aprovar"
          valor={titulo}
          aoMudar={setTitulo}
          maxLength={120}
          placeholder="Visual da página Sobre"
        />
        <CampoArea
          rotulo="Explicação curta (opcional)"
          valor={descricao}
          aoMudar={setDescricao}
          maxLength={1000}
          linhas={2}
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-[14px] font-medium">O que fizemos</legend>
          {itens.map((it, i) => (
            <div key={i} className="flex gap-2">
              <input
                aria-label={`Item ${i + 1}`}
                value={it}
                maxLength={200}
                onChange={(e) => setItens(itens.map((x, k) => (k === i ? e.target.value : x)))}
                className="h-11 min-w-0 flex-1 rounded-xl border border-[#DADAD3] bg-white px-3 text-base outline-none focus:border-hub-tinta md:text-[15px]"
              />
              {itens.length > 1 && (
                <button
                  type="button"
                  aria-label={`Remover item ${i + 1}`}
                  onClick={() => setItens(itens.filter((_, k) => k !== i))}
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#DADAD3] hover:bg-hub-fundo"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
          {itens.length < 12 && (
            <button
              type="button"
              onClick={() => setItens([...itens, ""])}
              className="inline-flex min-h-11 items-center gap-1.5 self-start text-[14.5px] font-medium text-[#1E3FA8]"
            >
              <Plus className="size-4" aria-hidden="true" /> Mais um item
            </button>
          )}
        </fieldset>
        <CampoTexto
          rotulo="Link da prévia (opcional)"
          tipo="url"
          inputMode="url"
          valor={previa}
          aoMudar={setPrevia}
          placeholder="https://"
          ajuda={
            previaOk
              ? "O cliente abre a prévia pelo portal."
              : "O link precisa começar com https://"
          }
        />
        <CampoEscolha
          rotulo="Conclui qual fase?"
          valor={fase === "" ? ("nenhuma" as string) : fase}
          aoMudar={(v) => setFase(v === "nenhuma" ? "" : v)}
          opcoes={[
            { id: "nenhuma", rotulo: "Nenhuma (entrega avulsa)" },
            ...abertas.map((f) => ({ id: f.id, rotulo: f.name })),
          ]}
          ajuda="A fase só é concluída quando o cliente aprovar."
        />
        {fase && (
          <button
            type="button"
            onClick={() => {
              aoConcluirSemAprovacao(fase);
              aoMudar(false);
            }}
            className="inline-flex min-h-11 items-center self-start text-[14px] font-medium text-hub-suave underline"
          >
            Esta fase é interna: concluir sem pedir aprovação
          </button>
        )}
      </div>
    </PainelLateral>
  );
}
