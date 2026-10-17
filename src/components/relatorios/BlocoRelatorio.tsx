import type { ReactNode } from "react";

/** Moldura dos blocos do relatório: rótulo, título que diz a conclusão e conteúdo. */
export function BlocoRelatorio({
  id,
  rotulo,
  titulo,
  resumo,
  children,
}: {
  id: string;
  rotulo: string;
  titulo: string;
  resumo?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-t`}
      className="flex flex-col gap-5 rounded-2xl border border-hub-borda bg-white p-5 md:p-7 print:break-inside-avoid print:border-[#ccc]"
    >
      <div className="flex flex-col gap-1">
        <span className="font-rotulo text-[12.5px] font-semibold uppercase tracking-[0.12em] text-hub-suave">
          {rotulo}
        </span>
        <h2
          id={`${id}-t`}
          className="font-titulo text-[20px] font-bold leading-snug md:text-[22px]"
        >
          {titulo}
        </h2>
        {resumo && <p className="max-w-3xl text-[14.5px] text-hub-suave">{resumo}</p>}
      </div>
      {children}
    </section>
  );
}
