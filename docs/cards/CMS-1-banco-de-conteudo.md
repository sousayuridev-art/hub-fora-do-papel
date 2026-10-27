# Card CMS-1 · Banco de conteúdo dos sites (27/10)

> PRD: `CMS-0-painel-de-conteudo-prd.md`. Aprovado pelo Yuri em 27/10.

## Requisitos
1. **Migração nova** em `supabase/migrations` (nunca editar antigas):
   - `sites` (id, tenant_id, client_id null, nome, dominio único, criado_em). Seed: site "Fora do Papel", domínio `www.foradopapel.com.br`, tenant da Fora do Papel, client_id null.
   - `site_artigos` (id, site_id, tenant_id, slug único por site, categoria, titulo, titulo_seo ≤ 60, descricao ≤ 155, resumo, capa ('cv0'..'cv3' ou url de imagem), corpo jsonb no formato `ConteudoArtigo` do site (pontos[3] + secoes[]), leitura, autor, situacao enum (rascunho, publicado, arquivado), publicado_em timestamptz, ordem int, atualizado_em).
   - `site_blocos` (id, site_id, tenant_id, chave text — ex.: `inicio.topo`, `inicio.frentes`, `perguntas`, `projetos`, `quem-somos` —, valor jsonb, situacao, publicado_em, atualizado_em; único por site+chave). O formato de cada chave fica documentado em comentário e validado no CMS-4.
   - Bucket `site-midia` público para leitura, 2 MB, jpg/png/webp.
   - RLS ativa em todas as tabelas: leitura e escrita só para o dono do tenant (`is_tenant_owner`). Escrita direta bloqueada para `authenticated`; tudo por RPC.
2. **RPCs de edição** (`security definer`, validam tenant, dono e campos; gravam `event_outbox` na mesma transação): `site_artigo_salvar(p_site, p_dados jsonb)` (cria ou atualiza rascunho), `site_artigo_publicar(p_id)`, `site_artigo_arquivar(p_id)`, `site_bloco_salvar(p_site, p_chave, p_valor)`, `site_bloco_publicar(p_site, p_chave)`.
   - Validar: slug `^[a-z0-9-]{3,80}$`; título SEO ≤ 60; descrição ≤ 155; `pontos` com exatamente 3 itens; sem marcadores `[` `]` pendentes em texto publicado (padrão `\[[A-ZÇÃÕ ]+\]`).
3. **RPCs públicas de leitura** (executáveis por `anon`, devolvem só o publicado do domínio pedido): `site_publico_artigos(p_dominio)` (lista sem corpo), `site_publico_artigo(p_dominio, p_slug)` (com corpo), `site_publico_blocos(p_dominio)`.
4. **Importação** do conteúdo atual: script `scripts/importar-site.ts` (ou SQL de seed) que lê os 10 artigos de `fora-do-papel-blueprint/src/data` e grava como publicados. Pode ser rodado de novo sem duplicar (upsert por slug).
5. **Testes pgTAP**: RLS (outro tenant não lê nem escreve; anon só via RPC pública), validações das RPCs, publicação grava evento, leitura pública ignora rascunho.

## Critérios de aceite
- [ ] `supabase test db` (ou o runner local) passa com os testes novos.
- [ ] `bun run build` e `bun run lint` passam.
- [ ] Nenhuma chave no código; anon só executa as três RPCs públicas.
