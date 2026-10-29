/**
 * Quadros que não cabem: título ou texto mais largo que a coluna (palavra longa) ou conteúdo mais
 * alto que a área. Mede o quadro montado em tamanho real; devolve os números dos slides.
 */
export function quadrosQueEstouram(nos: (HTMLElement | null)[]): number[] {
  const fora: number[] = [];
  nos.forEach((no, i) => {
    if (!no) return;
    const area = no.querySelector<HTMLElement>('[data-medir="area"]');
    const linhas = Array.from(no.querySelectorAll<HTMLElement>('[data-medir="linha"]'));
    const alto = !!area && area.scrollHeight > area.clientHeight + 1;
    const largo = linhas.some((l) => l.scrollWidth > l.clientWidth + 1);
    if (alto || largo) fora.push(i + 1);
  });
  return fora;
}
