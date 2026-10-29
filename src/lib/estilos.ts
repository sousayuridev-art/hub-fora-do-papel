/** Classes repetidas do Hub. */

/** Botão da ação principal da tela (o amarelo aparece só aqui). */
export const classeAcaoPrincipal =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#FFB020] px-5 text-[15px] font-semibold text-hub-tinta transition-colors hover:bg-[#F5A50F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-tinta sm:w-auto";

/** Botão secundário (branco com borda). */
export const classeBotaoSecundario =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#DADAD3] bg-white px-4 text-[15px] font-medium text-hub-tinta transition-colors hover:bg-hub-selecao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-tinta";

/**
 * Ação de texto (RD2-1): sem link azul sublinhado. Texto na cor da tinta sobre fundo neutro suave,
 * 44 px de toque. Use "›" no fim quando leva a outra tela e "⌄" quando abre algo ali.
 */
export const classeAcaoTexto =
  "inline-flex min-h-11 items-center gap-1 rounded-lg bg-sit-neutro px-3 text-[14px] font-medium text-hub-tinta transition-colors hover:bg-[#E6E6DF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-tinta md:min-h-9";

/** Link dentro de uma frase (RD2-1): negrito na cor da tinta, sem sublinhado. */
export const classeLinkTexto =
  "font-semibold text-hub-tinta transition-colors hover:text-[#4A4D54] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-tinta";

/** Colunas da lista da Central de Tarefas no computador (círculo, tarefa, situação, prioridade, prazo). */
export const gradeListaTarefas = "md:grid-cols-[44px_minmax(0,1fr)_130px_90px_110px]";

/** Colunas da tabela de projetos no computador (RD-2). */
export const gradeProjetos =
  "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_120px_140px_130px_110px]";

/** Cores das barras de situação usadas nos quadros. */
export const corColuna = {
  neutro: "#B9B9B2",
  info: "#1E3FA8",
  atencao: "#D48A00",
  ok: "#145A37",
  risco: "#9A1C12",
} as const;

/** Fundo listrado para valores previstos (não realizados). */
export const listrado = (cor: string) =>
  `repeating-linear-gradient(45deg, ${cor} 0 2px, color-mix(in srgb, ${cor} 18%, white) 2px 5px)`;
