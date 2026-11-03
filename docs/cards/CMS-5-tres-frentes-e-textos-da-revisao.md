# CMS-5 · Três frentes e textos da revisão do site

> Origem: documento "Revisão do site · Fora do Papel" (03/11/2026) e cards SITE-24 e SITE-25 do repositório do site (`fora-do-papel-blueprint`). Decisão de 03/11: juntar "Inteligência artificial aplicada" e "Automações e integrações" em um cartão.

## Problema
1. O site passou a ter 3 frentes e o validador dele exige exatamente 3. O banco e o editor do Hub ainda exigem 4 (`sistemas`, `ia`, `sites`, `automacoes`): quem editasse as frentes no Hub gravaria um bloco que o site recusa e mostra a reserva.
2. O banco manda quando a chave está publicada. Os textos de `inicio.topo`, `inicio.frentes` e `quem-somos` publicados em 27/10 continuam no ar mesmo depois de o site mudar a reserva.

## O que muda
1. Migração `20261103150000_cms5_tres_frentes_e_textos_da_revisao.sql`:
   - `_site_bloco_erro` passa a exigir exatamente 3 frentes, com ids `sistemas`, `sites` e `automacoes`, uma vez cada. Os outros limites não mudam.
   - Troca o texto publicado das três chaves pelos textos novos (os mesmos de `src/data/paginas.ts` do site). **Sobrescreve** o que estiver publicado nessas chaves. O valor anterior aparece como aviso (NOTICE) na execução: guarde-o se você editou algum desses blocos desde 27/10.
   - Idempotente: aplicar de novo não muda nada.
2. Editor do Hub (`src/lib/paginasSite.ts`, `FormFrentes`, `PreviaFrentes`): 3 frentes, com a terceira chamada "Automações e inteligência artificial", e a prévia em duas colunas.
3. Testes: `src/test/paginas-site.test.ts` e `supabase/tests/cms4_paginas.test.sql` para 3 frentes.

## Como aplicar
1. Rodar `supabase db reset` e `supabase test db` (o teste de banco foi ajustado sem rodar no Supabase local; a migração foi conferida em um Postgres 16 de teste com as funções reais e os dados importados em 27/10).
2. Conferir os textos novos na prévia do Hub.
3. Seguir `docs/banco-de-producao.md`: modo **verificar**, depois **aplicar**.
4. Publicar o site (Lovable) depois da migração, para o banco e o site usarem as mesmas 3 frentes.

## Base de contatos do site (card SITE-30)
Consulta para o SQL do Supabase (somente leitura). Contatos do site por semana, tipo e origem, e a contagem dos 30 dias antes da publicação da revisão:

```sql
-- por semana, tipo e origem
select date_trunc('week', created_at at time zone 'America/Fortaleza')::date as semana,
       tipo,
       coalesce(nullif(origem ->> 'utm_source', ''), 'direto ou sem origem') as origem,
       count(*) as contatos
  from public.site_contatos
 where created_at >= timestamptz '2026-10-04 00:00:00-03'
 group by 1, 2, 3
 order by 1, 2, 3;

-- base: 30 dias antes de 03/11/2026
select count(*) as contatos_30_dias_antes
  from public.site_contatos
 where created_at >= timestamptz '2026-10-04 00:00:00-03'
   and created_at <  timestamptz '2026-11-03 00:00:00-03';
```

Anote o número e a data em que o site novo foi ao ar. A comparação é entre os 30 dias antes e os 30 dias depois.

## Critérios de aceite
- [x] O banco recusa 2 e 4 frentes e aceita as 3 (teste em Postgres 16 com as funções reais).
- [x] As cinco chaves passam na validação depois da migração e a migração é idempotente.
- [x] `bun run test`, `bun run lint` e `bun run build` passam.
- [ ] `supabase test db` passa no Supabase local.
- [ ] Migração aplicada em produção pelo fluxo de `docs/banco-de-producao.md`.
- [ ] O site no ar mostra o topo, as 3 frentes e "Quem cuida do seu projeto" novos.
