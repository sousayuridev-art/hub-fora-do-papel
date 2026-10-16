import type { ReactNode } from "react";

/** Bloco de Configurações › Preços: título, explicação e onde o valor é usado. */
export function SecaoPreco({
  id,
  titulo,
  texto,
  usadoEm,
  children,
}: {
  id: string;
  titulo: string;
  texto: string;
  usadoEm: string[];
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className="grid gap-5 rounded-2xl border border-hub-borda bg-white p-5 md:p-6 lg:grid-cols-[260px_1fr]"
    >
      <div className="flex flex-col gap-2">
        <h2 id={`${id}-titulo`} className="font-titulo text-lg font-bold">
          {titulo}
        </h2>
        <p className="text-[14px] text-hub-suave">{texto}</p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Usado em">
          {usadoEm.map((u) => (
            <li
              key={u}
              className="rounded-md bg-sit-neutro px-2 py-0.5 text-[12.5px] font-semibold uppercase tracking-wide text-sit-neutro-t"
            >
              {u}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}
