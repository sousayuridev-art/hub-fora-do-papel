/** Título numerado das seções da proposta (01 O que ouvimos de você). */
export function TituloSecao({
  numero,
  id,
  children,
}: {
  numero: number;
  id: string;
  children: string;
}) {
  return (
    <h2
      id={`${id}-t`}
      className="flex items-baseline gap-3 font-titulo text-[20px] font-bold tracking-tight md:text-[30px]"
    >
      <span className="text-[13px] font-semibold text-hub-suave tabular-nums">
        {String(numero).padStart(2, "0")}
      </span>
      {children}
    </h2>
  );
}
