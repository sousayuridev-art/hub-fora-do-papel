import type { ReactNode } from "react";

/** Cartão de uma seção do editor de proposta. */
export function BlocoEditor({
  id,
  titulo,
  texto,
  children,
  acao,
}: {
  id: string;
  titulo: string;
  texto?: string;
  children: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-t`}
      className="flex flex-col gap-4 rounded-2xl border border-hub-borda bg-white p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={`${id}-t`} className="font-titulo text-[17px] font-bold">
            {titulo}
          </h2>
          {texto && <p className="text-[14px] text-hub-suave">{texto}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}
