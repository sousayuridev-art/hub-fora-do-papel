# CMS-0 · Painel de conteúdo dos sites no Hub · PRD (27/10)

> **Decisão do Yuri (27/10):** o painel fica dentro do Hub (não Sanity) e cobre tudo: artigos, textos das páginas, projetos reais e imagens. Primeiro uso: o site da Fora do Papel. Depois: os sites dos clientes, com a mesma base.

## Visão de negócio
- Hoje mudar um texto do site exige código e publicação. Com o painel, o Yuri (e depois o cliente) edita e publica em minutos.
- Vira oferta: "você mesmo atualiza o site" já é promessa da frente de sites; o painel é a prova e o produto, com a marca do cliente.
- Métrica: tempo para publicar um artigo novo (meta: menos de 15 minutos, sem código) e número de sites de clientes usando o painel em 90 dias.

## Arquitetura
- **Banco (Supabase do Hub):** um registro por site (`sites`), ligado ao tenant e, quando for de cliente, ao `clients`. Conteúdo em tabelas próprias com `site_id` e `tenant_id`, RLS por tenant, escrita só por RPC `security definer`.
- **Leitura pública:** o site chama uma RPC pública (`site_publico_*`) com a chave publishable; ela devolve só o que está publicado. Sem RLS aberta.
- **Site:** busca o conteúdo no servidor (renderização no servidor, bom para o Google), com cache curto, e cai no conteúdo estático atual se o banco falhar. Mapa do site gerado pelo servidor a partir do banco.
- **Imagens:** bucket público `site-midia` no Storage, com limite de tamanho e tipos (jpg, png, webp, svg proibido).
- **Rascunho e publicado:** toda peça tem situação (rascunho, publicado, arquivado). Publicar grava a data e um evento no `event_outbox`.

## Fases (cards)
| Card | Repositório | Entrega |
|---|---|---|
| CMS-1 | Hub | Banco: tabelas, RLS, RPCs de edição e de leitura pública, bucket, importação do conteúdo atual, testes |
| CMS-2 | Hub | Telas: Conteúdo do site → Artigos (lista e editor por blocos), Mídia |
| CMS-3 | Site | Artigos e mapa do site lidos do banco, com reserva estática |
| CMS-4 | Hub + site | Páginas (topo, frentes, perguntas, projetos reais, quem somos) editáveis por campos fixos, sem mexer no layout |

## Fora do escopo
- Editor visual de arrastar blocos de layout; criar páginas novas pelo painel; cliente editando sozinho (fica para depois da v1, com papel próprio); várias línguas.

## Riscos
- Site depender do banco: mitigado com reserva estática e cache.
- Texto longo quebrar layout: campos de página com limite de caracteres e prévia.
- Lighthouse cair por busca no servidor: medir antes e depois; meta ≥ 90.
