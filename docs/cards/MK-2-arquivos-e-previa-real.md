# Card MK-2 · Arquivos da peça e prévia real

> **Origem:** PRD `docs/cards/MK-0-central-de-marketing-prd.md`, entrega MK-2 (29/10/2026).
> **Depende de:** MK-1 (Central de conteúdo) e S8 (Materiais, Storage privado `materiais`).
> **Decisões propostas (Yuri aprova antes do código):** os arquivos continuam morando em Materiais, numa categoria nova; a versão só aponta para eles. Formato visual sem arquivo não vai para aprovação.

**Objetivo:** cada versão mostra os arquivos de verdade (slides, imagem, vídeo ou PDF), na ordem certa e no formato da rede. Assim a aprovação é feita olhando a peça como ela vai sair, e os arquivos não se perdem fora do Hub.

**Não entra:**

- edição de imagem ou vídeo dentro do Hub;
- imagem gerada por IA (MK-3 só sugere texto);
- modelos visuais da marca (MK-6);
- conversão ou compressão de vídeo, e miniatura da primeira página do PDF;
- arquivos de mais de 25 MB, o limite do S8;
- histórico de versões do arquivo (trocar o arquivo registra a troca, mas não guarda cópias).

## Requisitos

### Banco (`supabase/migrations/[data]_mk2_arquivos_da_peca.sql`)

- **Categoria nova em Materiais:** `redes` ("Conteúdo das redes"), para os arquivos que vêm das peças. A tela de Materiais passa a mostrar essa categoria.
- **Tabela `mkt_version_media`** (com `tenant_id`, RLS só de leitura para o dono e escrita só por RPC):
  - colunas: `version_id`, `material_id` e `papel`;
  - papéis possíveis: slide, capa, imagem, vídeo ou documento;
  - `posicao` dá a ordem dos slides;
  - o mesmo arquivo não entra duas vezes na mesma versão.
- **O que cada papel aceita:**
  - só material do tipo arquivo, do mesmo tenant e fora da lixeira;
  - slide, capa e imagem aceitam imagem (png, jpeg, webp);
  - vídeo aceita mp4;
  - documento aceita pdf.
- **Formatos visuais exigem arquivo para a aprovação.** A porta de aprovação do MK-1 passa a pedir arquivo nos formatos visuais:
  - carrossel, carrossel de fotos e documento: pelo menos um slide (ou o PDF, no documento);
  - post único e stories: imagem;
  - Reels, vídeo, vídeo curto, Shorts e vídeo longo: vídeo;
  - post de texto e artigo: sem exigência;
  - anúncio: sem exigência.
- **Arquivo na lixeira:** a versão ganha um aviso que bloqueia a aprovação ("um arquivo desta versão está na lixeira"). A peça já publicada não muda.
- **RPCs de dono:** cada uma grava no histórico da peça os novos tipos `midia_ligada` e `midia_removida`.
  - `mkt_midia_ligar(versao, material, papel)`: põe o arquivo no fim da lista;
  - `mkt_midia_remover(id)`;
  - `mkt_midia_ordenar(versao, ids[])`: só aceita a lista completa dos arquivos da versão.
- **Mesmas regras do MK-1:**
  - mexer nos arquivos de uma peça aprovada desfaz a aprovação;
  - versão publicada não muda os arquivos.
- **Arquivos na peça:** `_mkt_peca_json` passa a trazer, para cada versão, a lista `midias` com título, tipo, caminho no Storage e papel. O caminho só serve para pedir o link temporário, que o Storage libera apenas para o dono.
- **Testes pgTAP:** `supabase/tests/mk2_arquivos_da_peca.test.sql`.

### Telas

- **Aba Versões › Arquivos:**
  - **Enviar do computador:** usa o envio em três passos do S8, já na categoria `redes`, e liga o arquivo à versão no fim.
  - **Escolher de Materiais:** abre um painel de busca, só com arquivos, filtrado pelo tipo que o formato aceita.
  - **Lista de arquivos:** cada um com miniatura, nome, papel, "Subir/Descer" (alvos de 44 px; sem arrastar no celular) e "Remover".
  - **Proporção:** aviso na tela, sem bloquear, quando a imagem não tem a proporção do formato (4:5 no feed, 9:16 no vertical, 16:9 no vídeo longo). A proporção é medida pela imagem carregada.
- **Prévia:**
  - carrossel: passa slide a slide, com contador "2 de 6";
  - post único e stories: mostram a imagem real;
  - Reels e vídeo: tocador sem som, com a área segura marcada por cima;
  - documento: botão "Abrir o PDF".
  - Sem arquivo, a prévia continua a de hoje (capa com o gancho).
- **Links dos arquivos:** pedidos em lote (`createSignedUrls`), válidos por 10 minutos e renovados ao reabrir o painel.
- **Cartão do quadro:** miniatura do primeiro arquivo da primeira versão, quando houver.
- **Atualização na tela:** ligar, remover e ordenar mudam a tela na hora, voltam se o banco recusar e oferecem "Tentar de novo".

## Critérios de aceite

- [ ] **Envio do computador:** dado um carrossel do Instagram, quando envio 6 imagens, então elas aparecem na ordem do envio e a prévia passa slide a slide.
- [ ] **Ordem:** subir o slide 3 muda a ordem na prévia e continua igual depois de recarregar.
- [ ] **Porta da aprovação:** Reels sem vídeo não entra em Aprovação, e a tela diz "falta: vídeo".
- [ ] **Lixeira:** mandar para a lixeira um arquivo usado numa versão em Aprovação bloqueia a aprovação, com o aviso.
- [ ] **Depois da aprovação:** trocar um slide de peça aprovada volta a peça para Aprovação.
- [ ] **Tipo errado:** PDF não entra como slide, e mp4 não entra como capa.
- [ ] **Isolamento:**
  - dono de outro tenant não liga arquivo seu nem vê os arquivos da peça;
  - cliente do portal não lê `mkt_version_media`.
- [ ] **Sem rede:** remover um arquivo volta à lista com "Tentar de novo".
- [ ] **Conferência:** `supabase test db`, `bun run build`, `bun run lint` e `bun run test` passam.

## Para o Yuri depois de publicar

- Rodar o fluxo "Banco de produção" (verificar, depois aplicar).
- Para as peças já publicadas, ligar os arquivos é opcional: a prévia delas continua funcionando sem arquivo.

## Perguntas antes de começar

1. ~~Formato visual sem arquivo: bloquear ou só avisar?~~ **Decidido (Yuri, 29/10): bloquear.**
2. ~~Arquivos que o cliente enviou podem entrar numa peça?~~ **Decidido (Yuri, 29/10): sim, só com o cliente ligado à peça e a autorização marcada.**
