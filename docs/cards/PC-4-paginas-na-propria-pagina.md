# Card PC-4 · Editar páginas direto na página

> **Origem:** PRD `PC-0` (27/10). Protótipo de referência: Lovable "Painel Fora do Papel" (Páginas e editor; código em `src/components/builder` e `src/editor`).
> **Decisões:** edição com o Puck (`@puckeditor/core`), interface nossa; o cliente edita textos e fotos e adiciona só seções aprovadas para o site; o layout é da Fora do Papel (CMS-0). Este card estende o CMS-4 (campos fixos) para páginas montadas por seções.
> **Depende de:** PC-3 (fotos), CMS-3 (site lendo o banco).
> **Leitura dos sites (Yuri, 27/10):** vale para sites novos e para os que já migraram para o banco do Hub. Site antigo, ainda sem migrar, não mostra o editor: a página aparece com "Para editar esta página, peça à Fora do Papel" e o botão do pedido de ajuste (PC-2).

**Objetivo:** o cliente abre uma página do site, clica no texto ou na foto e edita ali mesmo, vê no computador e no celular, e publica; o site passa a mostrar a versão publicada.

**Não entra:**
- Criar página nova pelo painel (pedido de ajuste).
- Biblioteca de arrastar seções e a aba de estrutura para o cliente.
- Histórico com "voltar para a versão anterior" na tela (o banco já guarda as versões; a tela é P1).

## Requisitos
### Banco (`supabase/migrations/[data]_pc4_paginas.sql`)
- `site_paginas` (id, site_id, tenant_id, nome, caminho único por site, rascunho jsonb, publicado jsonb, publicado_em, atualizado_em, versao int). O jsonb segue o formato de dados do Puck (`root` + `content[]` com `type` e `props`).
- `site_paginas_versoes` (pagina_id, tenant_id, dados jsonb, publicado_em, publicado_por) — só inserção, na publicação.
- `site_secoes_permitidas` (site_id, tipo, travada bool): quais seções o cliente pode adicionar e quais ficam fixas (ex.: rodapé travado). Definido pelo Yuri no Hub.
- RPCs: `site_pagina_salvar_rascunho(p_id, p_dados, p_versao)` — recusa se a versão mudou (`pagina_alterada`, outra pessoa editou); `site_pagina_publicar(p_id, p_versao)` — recusa se a versão vista não é a atual (`pagina_alterada`, revisão de 28/10); valida que só há seções permitidas, que nenhuma seção travada foi removida ou movida, limites de caracteres por campo e nenhum marcador `[ ]`; copia para `publicado`, grava versão e evento `pagina.publicada`. Exceção registrada: o rascunho automático (a cada 1,2 s) não grava evento em `event_outbox`, para não encher a fila; o evento sai na publicação.
- Leitura pública: `site_publico_pagina(p_dominio, p_caminho)` devolve só `publicado`.
- Permissão de edição: `pode_editar_site` (PC-3).

### Telas
- **Páginas** (`/portal/site/paginas`): cartões com miniatura, nome, endereço e "No ar"; "Pedir página nova" abre o pedido de ajuste (PC-2).
- **Editor** (`/portal/site/paginas/$id`), tela cheia com o menu recolhido:
  - barra: Voltar, nome da página, situação ("Rascunho salvo · não publicado" / "Tudo publicado"), Computador | Celular, desfazer, refazer, pré-visualizar, "Publicar" (principal);
  - canvas renderizado na largura real (1280 ou 390 px) e reduzido para caber, para os breakpoints do site valerem;
  - texto editável no próprio canvas; painel à direita com os campos da seção selecionada (foto primeiro, com "Trocar foto" abrindo "Escolher foto" do PC-3);
  - "+ Seção abaixo" na barra da seção selecionada, com só as seções de `site_secoes_permitidas`;
  - seção travada mostra "Seção fixa do site: você edita os textos, mas ela não sai do lugar";
  - "Pedir ajuste nesta página" leva ao PC-2 com a página preenchida;
  - celular: tocar numa seção abre os campos em bottom sheet; "+ Seção" adiciona antes do rodapé.
- Rascunho salvo automaticamente (espera curta depois de digitar).
- Os componentes de seção do site ficam num pacote compartilhado entre o Hub (editor) e o site (renderização), para o que se vê no editor ser o que vai ao ar.
- **Hub › ficha do site:** o Yuri escolhe as seções permitidas e as travadas.

## Critérios de aceite
- Sem o módulo `paginas` em `sites.modulos`, as RPCs de gravação recusam com `modulo_nao_contratado` (42501), mesmo chamadas por fora da tela (teste de banco). O dono passa sempre (regra do PC-3, `_site_editavel`).
- Dado o responsável na Página inicial, quando troca a foto da capa e publica, então `site_publico_pagina` devolve a foto nova e o site mostra em até 5 minutos.
- Publicar com uma seção não permitida (enviada por chamada direta) é recusado pelo banco.
- Remover ou mover a seção travada é recusado pelo banco.
- Duas pessoas editando: a segunda recebe "Esta página foi alterada por outra pessoa" e recarrega sem perder o próprio texto (fica copiável).
- Pessoa de outra empresa não lê nem salva a página (teste de banco).
- Texto no limite não quebra o site em 360, 768 e 1280 px.
- pgTAP `supabase/tests/pc4_paginas.test.sql` passa; `bun run build`, `bun run lint`, `bun run test` passam nos dois repositórios.

## Para o Yuri depois de publicar
- Definir as seções permitidas e travadas de cada site antes de liberar o editor ao cliente.
- Medir o Lighthouse do site antes e depois (meta ≥ 90, CMS-0).
