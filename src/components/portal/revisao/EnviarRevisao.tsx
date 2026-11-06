import { Info } from "lucide-react";

import { PainelLateral } from "@/components/hub/PainelLateral";

const passos = [
  ["Recebemos e olhamos cada um", "Em até 1 dia útil você vê o prazo de cada ajuste."],
  ["Fazemos os ajustes", "Você acompanha aqui, em Meu site."],
  ["Você confere o antes e o depois", "E diz se ficou bom."],
] as const;

/** "Enviar N ajustes?" (card RS-2, tela 06): o que acontece depois e o aviso do combinado. */
export function EnviarRevisao({
  aberto,
  aoMudar,
  total,
  numero,
  incluidas,
  enviando,
  aoEnviar,
}: {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  total: number;
  numero: number;
  incluidas: number;
  enviando: boolean;
  aoEnviar: () => void;
}) {
  const alem = numero > incluidas;
  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo={`Enviar ${total} ${total === 1 ? "ajuste" : "ajustes"}?`}
      descricao={
        alem
          ? `Esta é a revisão ${numero}. As ${incluidas} revisões incluídas já foram usadas.`
          : `Esta é a revisão ${numero} de ${incluidas} incluídas.`
      }
      rodape={
        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            disabled={enviando}
            onClick={aoEnviar}
            className="h-12 w-full rounded-xl bg-[#FFB020] text-base font-semibold text-hub-tinta shadow-[0_8px_20px_-12px_rgba(255,176,32,0.9)] disabled:opacity-60"
          >
            {enviando ? "Enviando…" : "Enviar"}
          </button>
          <button
            type="button"
            onClick={() => aoMudar(false)}
            className="h-12 w-full rounded-xl border border-[#DADAD3] bg-white text-base font-semibold text-hub-tinta"
          >
            Voltar para a lista
          </button>
        </div>
      }
    >
      <ol className="flex flex-col gap-3 rounded-2xl bg-portal-fundo p-4">
        {passos.map(([titulo, texto], i) => (
          <li key={titulo} className="flex gap-3">
            <span
              className={
                i === 0
                  ? "grid size-7 shrink-0 place-items-center rounded-full bg-[#FFB020] text-[13px] font-bold text-hub-tinta"
                  : "grid size-7 shrink-0 place-items-center rounded-full bg-hub-tinta text-[13px] font-bold text-white"
              }
            >
              {i + 1}
            </span>
            <div>
              <b className="block text-[15px] text-hub-tinta">{titulo}</b>
              <span className="text-[14px] text-hub-suave">{texto}</span>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 flex gap-2.5 rounded-xl bg-sit-atencao p-3 text-[14px] leading-snug text-sit-atencao-t">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {alem
          ? "Estes ajustes provavelmente serão serviço adicional: mandamos o valor para você aprovar antes de começar."
          : "Se algum ajuste for além do combinado, mandamos o valor antes. Nada é feito sem você aprovar."}
      </p>
    </PainelLateral>
  );
}
