import type { ReactNode } from "react";

/** Cabeçalho das telas do portal: rótulo, título (h1 28 px no celular) e texto de apoio. */
export function TituloPortal({
  rotulo,
  titulo,
  texto,
  acao,
}: {
  rotulo: string;
  titulo: string;
  texto?: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex max-w-2xl flex-col gap-2">
        <span className="font-rotulo text-[13.5px] font-medium text-hub-suave">{rotulo}</span>
        <h1 className="font-marca text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em] md:text-[48px]">
          {titulo}
        </h1>
        {texto && (
          <p className="text-[15px] leading-relaxed text-hub-suave md:text-base">{texto}</p>
        )}
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </header>
  );
}
