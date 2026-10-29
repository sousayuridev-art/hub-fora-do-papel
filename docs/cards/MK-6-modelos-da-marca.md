# Card MK-6 · Modelos da marca

> **Origem:** PRD `docs/cards/MK-0-central-de-marketing-prd.md`, entrega MK-6. Pedido do Yuri (29/10/2026): "Siga!" (fazer o MK-6 enquanto a decisão do MK-5 é levantada).
> **Regras que valem:** skill `marca-fora-do-papel` (decidida em 28/10: cores, fontes, grade 1080 × 1350, capa, slides do meio, chamada final, TUDO) e `conteudo-redes-fora-do-papel`.
> **Depende de:** MK-1 a MK-3 no ar (slides, gancho, chamada, arquivos da versão e IA).

**Objetivo:** transformar o texto de uma versão (gancho, slides e chamada) em imagens prontas com o desenho da marca — carrossel 1080 × 1350 e capa vertical 1080 × 1920 de Reels, Shorts, TikTok e Stories — e anexar à versão com um clique, depois de a pessoa conferir. Peça de texto com bom design sai sem abrir o Canva; peça com foto ou tela continua sendo feita por pessoa.

## Problema

Hoje cada carrossel precisa ser montado à mão num editor de imagem, repetindo cores, fontes, margens e rodapé. Isso toma a maior parte do tempo de produção, abre espaço para erro de marca (âmbar em dois lugares, slide do meio com cabeçalho, capa igual à anterior na grade) e trava a aprovação, que exige os arquivos (MK-2).

## Não entra

- imagem gerada por IA (direção do MK-0);
- foto ou tela real dentro do modelo (continua sendo arquivo enviado em Materiais);
- editor livre de design (arrastar, mudar fonte): os modelos são fixos, para a marca não variar;
- PDF do documento do LinkedIn (P1 abaixo);
- modelos por cliente (P2).

## Requisitos

### P0 · Modelos (no código, `src/lib/modelosMarca.ts` + componentes)

- **Capa do carrossel (1080 × 1350):** cabeçalho com a assinatura (símbolo + "fora do papel"), rótulo em Geist Mono caixa alta (o pilar), título em Bricolage 800 (o gancho ou o título do 1º slide), "Arraste para o lado →", rodapé com foradopapel.com.br e contador. Três temas: **escuro** (#0E1013 com brilho azul-marinho e grade fina), **claro** (#F5F5F2) e **âmbar** (#FFB020, símbolo com quadrado escuro).
- **Slide do meio:** sem cabeçalho e sem o site; título e texto centralizados; rodapé só com o contador. Fundo claro na capa clara; escuro nas outras.
- **Chamada final:** texto do último slide + botão com as palavras do manual ("Marcar uma conversa", etc.) + "Link na bio". Dois temas que alternam: âmbar com botão escuro, ou escuro com botão âmbar.
- **Capa vertical (1080 × 1920):** mesma tipografia, título dentro da área segura (150 px em cima e 250 px embaixo livres).
- **TUDO:** etiqueta âmbar com texto escuro (no fundo âmbar, etiqueta escura com texto âmbar), uma vez por peça (a revisão da marca do MK-1 já avisa a repetição).
- **Margens:** 88 px em cima e embaixo, 96 px dos lados; nada a menos de 40 px das laterais.
- **Texto que não cabe:** o tamanho do título desce em degraus (124 → 96 → 80 px); passando do limite, o modelo avisa "texto longo para o slide N" e não gera até encurtar.
- Fontes da marca embutidas no próprio Hub (sem depender do Google na hora de gerar) e carregadas só quando o modelo abre.

### P0 · Banco (`supabase/migrations/[data]_mk6_modelos.sql`)

- `mkt_versions.modelo` (jsonb, nulo = nunca gerado): `{ "capa": "escuro" | "claro" | "ambar", "final": "ambar" | "escuro", "gerado_em" }`.
- `mkt_versao_modelo(p_id, p_capa, p_final)`: grava a escolha (dono, versão não publicada); evento `modelo_gerado` no histórico.
- `mkt_proxima_capa(p_canal)`: tema da última capa gerada no canal (versões agendadas ou publicadas, mais recente) e o próximo sugerido na ordem escuro → claro → âmbar, para a grade alternar.
- Teste pgTAP `supabase/tests/mk6_modelos.test.sql`.

### P0 · Tela

- **Versão › Arquivos:** botão "Gerar com o modelo da marca" (carrossel, documento, Reels, Shorts, vídeo do TikTok, Stories). Abre painel lateral (bottom sheet no celular):
  - escolha do tema da capa (padrão: o próximo sugerido, com a frase "a última capa no Instagram foi escura") e do tema da chamada final;
  - miniaturas de todos os quadros, na ordem, com aviso de texto longo;
  - "Gerar e anexar": gera os PNG, envia para Materiais (categoria Conteúdo das redes) e liga à versão no papel certo (slide ou capa), pelo mesmo caminho do MK-2 (otimista, com "Tentar de novo" só do que faltou).
  - Se a versão já tem slides ou capa, pergunta antes: "Os N arquivos atuais saem da versão (continuam em Materiais)".
- **Prévia (MK-2):** sem arquivo, a prévia já mostra o modelo (em vez do desenho genérico de hoje).
- **IA (MK-3):** instruções passam a citar os limites do modelo (título da capa até 60 caracteres, texto do slide até 220), versão "marketing-ia v2".

### P1

- PDF do carrossel para o documento do LinkedIn.
- Faixa em 3 imagens (mosaico 3240 × 1350).

### P2

- Modelos por cliente (cores e fontes da marca do cliente).

## Casos de borda

- Versão sem slides (Reels): só a capa vertical, com o gancho.
- Slides vazios no meio: não geram quadro.
- Mais de 8 slides: gera todos, mas avisa (o manual pede de 3 a 8).
- Sem chamada escolhida: o último slide sai como slide do meio.
- Navegador sem permissão de armazenamento ou envio falhando no 3º de 6: os enviados ficam ligados; "Tentar de novo" envia só os que faltaram (comportamento do MK-2).
- Versão publicada: botão não aparece.
- Outro tenant: RPCs pelo `_tenant_do_dono()`.

## Critérios de aceite

- [ ] Dado um carrossel com 5 slides e chamada "Marcar uma conversa", quando gero com capa escura e final âmbar, então 5 PNG de 1080 × 1350 entram na versão como slides, na ordem, e a aprovação deixa de pedir arquivos.
- [ ] A capa tem cabeçalho, rótulo, título, "Arraste para o lado →" e rodapé com o site; os slides do meio não têm cabeçalho nem site.
- [ ] TUDO aparece como etiqueta âmbar (escura no fundo âmbar).
- [ ] Reels gera uma capa 1080 × 1920 com o título dentro da área segura.
- [ ] Texto que não cabe bloqueia a geração e diz qual slide.
- [ ] A sugestão de tema alterna com a última capa do canal.
- [ ] Dono de outro tenant não grava modelo nem lê a última capa.
- [ ] Gerar funciona a 390 px; alvos de 44 px; nenhum script novo no carregamento das outras telas (o gerador carrega só ao abrir).
- [ ] `supabase test db`, `bun run build`, `bun run lint` e `bun run test` passam.

## Métrica de sucesso

- Rápida: o próximo carrossel de texto sai do Hub sem editor de imagem.
- Depois: tempo entre "Produção" e "Aprovação" cai pela metade nas peças só de texto (histórico do MK-1).

## Para o Yuri depois de publicar

- Gerar um carrossel, abrir os PNG no celular e conferir cores, fontes e margens contra o manual antes de postar.
