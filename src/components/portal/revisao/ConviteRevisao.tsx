import { ExternalLink, Hand, Sparkles } from "lucide-react";

const passos = [
  ["Toque no que quer mudar", "Um texto, uma foto, uma parte inteira."],
  ["Diga como quer", "Escreva ou grave um áudio. Vai tudo para uma lista."],
  ["Envie tudo de uma vez", "Fazemos os ajustes e avisamos quando estiver pronto para você ver."],
] as const;

/** "Seu site está pronto para você revisar" (card RS-2, tela 01): explica em 3 passos. */
export function ConviteRevisao({
  dominio,
  incluidas,
  aoComecar,
}: {
  dominio: string;
  incluidas: number;
  aoComecar: () => void;
}) {
  return (
    <section aria-labelledby="convite-t" className="flex max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-3">
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-sit-atencao px-3 py-1 text-[13px] font-semibold text-sit-atencao-t">
          <Sparkles className="size-3.5" aria-hidden="true" /> Primeira versão pronta
        </span>
        <h1
          id="convite-t"
          className="font-marca text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em] md:text-[44px]"
        >
          Seu site está pronto para você revisar
        </h1>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-hub-borda bg-white p-5">
        <h2 className="text-[17px] font-bold">Como funciona</h2>
        <ol className="flex flex-col gap-3.5">
          {passos.map(([titulo, texto], i) => (
            <li key={titulo} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-hub-tinta text-[13px] font-bold text-white">
                {i + 1}
              </span>
              <div>
                <b className="block text-base text-hub-tinta">{titulo}</b>
                <span className="text-[14.5px] text-hub-suave">{texto}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p className="text-[14.5px] text-hub-suave">
        Você tem <b className="text-hub-tinta">{incluidas} revisões incluídas</b>. Sua equipe também
        pode marcar ajustes.
      </p>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-5">
        <button
          type="button"
          onClick={aoComecar}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#FFB020] px-6 text-base font-semibold text-hub-tinta shadow-[0_8px_20px_-12px_rgba(255,176,32,0.9)] max-md:w-full"
        >
          <Hand className="size-5" aria-hidden="true" /> Começar a revisão
        </button>
        <a
          href={`https://${dominio}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-1.5 text-[15px] font-semibold text-hub-tinta underline underline-offset-4"
        >
          Só olhar o site <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
