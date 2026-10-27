# Card CMS-3 · Site lê artigos do banco (27/10)

> PRD: `CMS-0`. Depende do CMS-1. Repositório `fora-do-papel-blueprint` (ganha card espelho SITE-19).

## Requisitos
1. Listagem e página de artigo buscam pelas RPCs públicas no servidor (loader da rota), com a chave publishable de `src/lib/config.ts`.
2. Reserva: se a RPC falhar ou demorar mais de 2 s, usa o conteúdo estático atual de `src/data`. Nada quebra para o visitante.
3. Cache: resposta pública com cache curto (até 5 min) para não pesar no Lighthouse.
4. Mapa do site: rota de servidor `/sitemap.xml` gerada a partir do banco (com reserva no arquivo estático).
5. Testes: loader com sucesso, com falha (usa reserva) e com artigo em rascunho (não aparece).

## Critérios de aceite
- [ ] Publicar um artigo no Hub faz ele aparecer no site em até 5 minutos, sem novo deploy.
- [ ] Lighthouse mobile ≥ 90 na listagem e num artigo.
- [ ] `bun run test`, `bun run lint`, `bun run build` passam.
