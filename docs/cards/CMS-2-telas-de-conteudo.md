# Card CMS-2 · Telas "Conteúdo do site" no Hub (27/10)

> PRD: `CMS-0`. Depende do CMS-1.

## Requisitos
1. Menu lateral, grupo Vender ou Operar: **Conteúdo do site** (`/app/site`), só para `owner`, com `exigirPapel` no `beforeLoad`.
2. **Artigos:** lista com busca e filtro por situação e categoria (virtualizada), selo de situação nas cores do Hub, botão principal "Novo artigo".
3. **Editor de artigo** em painel lateral largo (Sheet; bottom sheet no celular): campos de metadados com contador (título SEO 60, descrição 155), os 3 pontos, e o corpo por seções. Cada seção tem título e blocos: parágrafo, lista, passos, dica e exemplo, com botões para adicionar, mover e remover. Links no formato `[texto](/caminho)` com ajuda curta.
4. **Prévia** do artigo como fica no site antes de publicar. Ações: "Salvar rascunho", "Publicar" (principal) e "Arquivar". Atualização otimista com desfazer em caso de erro (toast).
5. **Mídia:** enviar imagem (jpg, png, webp até 2 MB) ao bucket, copiar o endereço, ver e apagar.
6. Textos de interface em português, sem termos em inglês; alvos de 44 px; 360 px sem rolagem lateral.

## Critérios de aceite
- [ ] Criar, editar, publicar e arquivar um artigo pelo Hub sem código.
- [ ] Erro de rede mostra toast e mantém o texto digitado.
- [ ] `bun run build`, `bun run lint`, `bun run test` passam.
