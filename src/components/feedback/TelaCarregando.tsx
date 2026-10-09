/** Tela neutra enquanto a sessão e o papel são confirmados. */
export function TelaCarregando() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-hub-fundo"
      role="status"
      aria-live="polite"
    >
      <span
        className="size-8 animate-spin rounded-full border-2 border-hub-borda border-t-hub-tinta"
        aria-hidden="true"
      />
      <span className="sr-only">Carregando</span>
    </div>
  );
}
