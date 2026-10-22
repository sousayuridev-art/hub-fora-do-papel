/** Classes repetidas do Hub. */

/** Botão da ação principal da tela (o amarelo aparece só aqui). */
export const classeAcaoPrincipal =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#FFB020] px-5 text-[15px] font-semibold text-hub-tinta transition-colors hover:bg-[#F5A50F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-tinta sm:w-auto";

/** Botão secundário (branco com borda). */
export const classeBotaoSecundario =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#DADAD3] bg-white px-4 text-[15px] font-medium text-hub-tinta transition-colors hover:bg-hub-selecao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-tinta";

/** Colunas da lista da Central de Tarefas no computador (círculo, tarefa, situação, prioridade, prazo). */
export const gradeListaTarefas = "md:grid-cols-[44px_minmax(0,1fr)_130px_90px_110px]";

/** Colunas da tabela de projetos no computador (RD-2). */
export const gradeProjetos =
  "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_120px_140px_130px_110px]";
