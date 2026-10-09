/** Página provisória de cada item de menu na Sprint 0. */
export function EmConstrucao({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="font-titulo text-[28px] font-semibold tracking-tight md:text-4xl">{titulo}</h1>
      <p className="text-[15px] text-hub-suave">{descricao ?? "Em construção."}</p>
    </section>
  );
}
