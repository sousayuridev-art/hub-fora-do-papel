const extenso = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const curto = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "2-digit" });

/** "2 de setembro de 2026" */
export function dataPorExtenso(iso: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return extenso.format(d);
}

/** "2/09" */
export function dataCurta(iso: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return curto.format(d);
}

/** Âncoras das seções da proposta (índice e barra do celular). */
export const secoes = [
  { id: "ouvimos", rotulo: "O que ouvimos" },
  { id: "fazer", rotulo: "O que vamos fazer" },
  { id: "fora", rotulo: "O que não está incluído" },
  { id: "trabalhar", rotulo: "Como vamos trabalhar" },
  { id: "investimento", rotulo: "Investimento" },
  { id: "depois", rotulo: "Depois do lançamento" },
  { id: "aceite", rotulo: "Aceite" },
] as const;
