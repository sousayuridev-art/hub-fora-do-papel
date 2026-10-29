import { useState } from "react";

import { CampoArea } from "@/components/hub/Campo";
import { classeAcaoPrincipal, classeBotaoSecundario } from "@/lib/estilos";
import { rotuloEtapa, type Etapa, type PecaDetalhe } from "@/lib/marketing";
import { cn } from "@/lib/utils";

/** Botão que espera a porta do banco: apagado enquanto falta algo. */
const esperando = "disabled:cursor-not-allowed disabled:opacity-50";

const proxima: Partial<Record<Etapa, Etapa>> = {
  ideia: "briefing",
  briefing: "conceito",
  conceito: "producao",
  producao: "refinamento",
  refinamento: "aprovacao",
};

/**
 * Rodapé do painel: a próxima ação da etapa. Em Aprovação, aprovar ou pedir ajuste (com nota
 * obrigatória). As portas são conferidas no banco; aqui só mostramos o que falta.
 */
export function AcoesPeca({
  p,
  ocupado,
  aoMover,
  aoAprovar,
  aoPedirAjuste,
}: {
  p: PecaDetalhe;
  ocupado: boolean;
  aoMover: (e: Etapa) => void;
  aoAprovar: () => void;
  aoPedirAjuste: (nota: string) => void;
}) {
  const [ajuste, setAjuste] = useState<string | null>(null);

  if (p.stage === "aprovacao") {
    if (ajuste !== null)
      return (
        <form
          className="flex w-full flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (ajuste.trim().length < 3) return;
            aoPedirAjuste(ajuste.trim());
            setAjuste(null);
          }}
        >
          <CampoArea
            rotulo="O que precisa mudar"
            valor={ajuste}
            aoMudar={setAjuste}
            linhas={3}
            maxLength={1000}
            ajuda="Fica no histórico da peça e volta para Refinamento."
          />
          <span className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" className={classeBotaoSecundario} onClick={() => setAjuste(null)}>
              Cancelar
            </button>
            <button
              type="submit"
              className={classeAcaoPrincipal}
              disabled={ocupado || ajuste.trim().length < 3}
            >
              Pedir ajuste
            </button>
          </span>
        </form>
      );
    return (
      <>
        <button type="button" className={classeBotaoSecundario} onClick={() => setAjuste("")}>
          Pedir ajuste
        </button>
        <button
          type="button"
          className={cn(classeAcaoPrincipal, esperando)}
          disabled={ocupado || p.falta.length > 0}
          onClick={aoAprovar}
        >
          Aprovar peça
        </button>
      </>
    );
  }

  if (p.stage === "pronto")
    return (
      <p className="text-[14px] text-hub-suave">
        Aprovada. Agende e marque cada versão como publicada na aba Versões.
      </p>
    );
  if (p.stage === "publicado")
    return (
      <p className="text-[14px] text-hub-suave">
        Publicada. Registre os resultados de cada versão para fechar a análise.
      </p>
    );
  if (p.stage === "analisado") return <p className="text-[14px] text-hub-suave">Peça analisada.</p>;

  const destino = proxima[p.stage];
  const emCriacao = ["conceito", "producao"].includes(p.stage);
  // A mesma porta do banco: com pendência, o botão espera (o aviso acima diz o que falta).
  const travado = (e: Etapa) =>
    p.falta.length > 0 &&
    (e === "aprovacao" || (["ideia", "briefing"].includes(p.stage) && e !== "briefing"));
  return (
    <>
      {emCriacao && (
        <button
          type="button"
          className={cn(classeBotaoSecundario, esperando)}
          disabled={ocupado || travado("aprovacao")}
          onClick={() => aoMover("aprovacao")}
        >
          Enviar para aprovação
        </button>
      )}
      {destino && (
        <button
          type="button"
          className={cn(classeAcaoPrincipal, esperando)}
          disabled={ocupado || travado(destino)}
          onClick={() => aoMover(destino)}
        >
          {destino === "aprovacao"
            ? "Enviar para aprovação"
            : `Avançar para ${rotuloEtapa[destino]}`}
        </button>
      )}
    </>
  );
}
