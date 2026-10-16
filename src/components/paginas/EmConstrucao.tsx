import { Hourglass } from "lucide-react";

/**
 * Tela de módulo ainda não construído. Diz o que vai existir aqui e o que usar enquanto isso,
 * em vez de uma página vazia.
 */
export function EmConstrucao({
  titulo,
  descricao,
  enquantoIsso,
}: {
  titulo: string;
  descricao?: string;
  enquantoIsso?: string;
}) {
  return (
    <section className="flex flex-col gap-5">
      <h1 className="font-titulo text-[28px] font-bold tracking-tight md:text-[32px]">{titulo}</h1>
      <div className="flex max-w-2xl flex-col gap-3 rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6">
        <span className="flex size-11 items-center justify-center rounded-xl bg-[#FFF1D6] text-[#9A5B00]">
          <Hourglass className="size-5" aria-hidden="true" />
        </span>
        <p className="text-[16px] font-semibold">Esta área está sendo preparada.</p>
        {descricao && <p className="text-[15px] text-hub-suave">{descricao}</p>}
        {enquantoIsso && (
          <p className="rounded-xl bg-hub-fundo px-4 py-3 text-[14.5px]">
            <strong className="font-semibold">Enquanto isso:</strong> {enquantoIsso}
          </p>
        )}
      </div>
    </section>
  );
}
