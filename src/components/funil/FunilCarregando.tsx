/** Esqueleto do quadro enquanto carrega (sem pular de lugar quando os dados chegam). */
export function FunilCarregando() {
  return (
    <div aria-busy="true" aria-label="Carregando o funil" className="grid gap-3 md:grid-cols-5">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2.5 rounded-2xl bg-coluna p-2.5 max-md:[&:not(:first-child)]:hidden"
        >
          <div className="h-10 animate-pulse rounded-lg bg-[#E1E1DA]" />
          {Array.from({ length: 3 - (i % 2) }, (__, j) => (
            <div key={j} className="h-32 animate-pulse rounded-xl bg-white" />
          ))}
        </div>
      ))}
    </div>
  );
}
