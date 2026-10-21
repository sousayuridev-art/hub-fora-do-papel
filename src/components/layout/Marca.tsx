/** Símbolo da Fora do Papel (o mesmo do protótipo). */
export function Simbolo({ tamanho = 30 }: { tamanho?: number }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="32" height="32" rx="9" fill="#FFB020" />
      <path d="M9 25V15h6" fill="none" stroke="#0E1013" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="14" y="7" width="11" height="11" rx="2" fill="#0E1013" />
    </svg>
  );
}

export function Marca() {
  return (
    <span className="flex items-center gap-2.5">
      <Simbolo />
      <span className="font-marca text-base font-semibold tracking-tight text-hub-tinta">
        Fora do Papel
      </span>
    </span>
  );
}

/**
 * Símbolo de contorno da marca (papel + quadrado âmbar), usado nas páginas do cliente sobre a capa
 * escura (direção A, cards CX-3 e CX-5).
 */
export function SimboloPapel({
  tamanho = 28,
  claro = true,
}: {
  tamanho?: number;
  claro?: boolean;
}) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect
        x="6"
        y="20"
        width="38"
        height="38"
        rx="2"
        fill="none"
        stroke={claro ? "#F5F5F2" : "#0E1013"}
        strokeWidth="5"
      />
      <rect x="28" y="4" width="30" height="30" rx="2" fill="#FFB020" />
    </svg>
  );
}
