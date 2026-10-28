export type PerguntasProps = {
  titulo: string;
  itens: { pergunta: string; resposta: string }[];
};

export function Perguntas({ titulo, itens }: PerguntasProps) {
  return (
    <section className="px-6 py-16 md:px-12 md:py-20">
      <div className="mx-auto max-w-3xl">
        <h2 className="break-words text-3xl font-semibold tracking-tight text-neutral-900">
          {titulo}
        </h2>
        <div className="mt-8 divide-y divide-neutral-200 border-y border-neutral-200">
          {(itens ?? []).map((f, i) => (
            <details key={i} className="group py-5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-neutral-900">
                <span className="min-w-0 break-words">{f.pergunta}</span>
                <span
                  aria-hidden="true"
                  className="text-xl transition-transform group-open:rotate-45"
                  style={{ color: "var(--site-cor)" }}
                >
                  +
                </span>
              </summary>
              <p className="mt-3 whitespace-pre-line break-words leading-relaxed text-neutral-600">
                {f.resposta}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
