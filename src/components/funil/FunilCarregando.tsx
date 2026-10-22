/** Esqueleto do quadro enquanto carrega, no mesmo formato das colunas (sem pular de lugar). */
export function FunilCarregando() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando o funil"
      className="-mx-4 flex overflow-hidden px-4 md:-mx-8 md:px-8 xl:mx-0 xl:grid xl:grid-cols-5 xl:px-0"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={`flex w-[82vw] max-w-[340px] shrink-0 flex-col gap-2.5 px-3 md:w-[280px] md:max-w-none xl:w-auto xl:px-4 ${i > 0 ? "border-l border-hub-borda" : ""}`}
        >
          <div className="h-[3px] rounded-full bg-[#E1E1DA]" />
          <div className="h-10 animate-pulse rounded-lg bg-[#E8E8E2]" />
          {Array.from({ length: 3 - (i % 2) }, (__, j) => (
            <div
              key={j}
              className="h-32 animate-pulse rounded-xl border border-hub-borda bg-white"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
