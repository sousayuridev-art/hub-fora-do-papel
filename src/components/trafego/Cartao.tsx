import type { ReactNode } from "react";

/** Cartão de bloco da tela de tráfego, com título, explicação e etiqueta do período. */
export function Cartao({
  id,
  titulo,
  texto,
  etiqueta,
  acao,
  children,
}: {
  id: string;
  titulo: string;
  texto?: string;
  etiqueta?: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-t`}
      className="flex flex-col gap-4 rounded-2xl border border-hub-borda bg-white p-5 md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={`${id}-t`} className="font-titulo text-[18px] font-bold">
            {titulo}
          </h2>
          {texto && <p className="max-w-[70ch] text-[14px] text-hub-suave">{texto}</p>}
        </div>
        <div className="flex items-center gap-2">
          {etiqueta && (
            <span className="rounded-md border border-hub-borda px-2 py-0.5 text-[12.5px] font-medium text-hub-suave">
              {etiqueta}
            </span>
          )}
          {acao}
        </div>
      </div>
      {children}
    </section>
  );
}
