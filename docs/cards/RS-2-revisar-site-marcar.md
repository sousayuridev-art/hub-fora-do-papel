# Card RS-2 · Revisar o site: marcar ajustes e enviar a rodada (telas 01 a 06)

> **Origem:** especificação "Módulo de Revisão do Site", 06/11/2026, e canvas "Portal · Revisar o site", telas 01 a 06 e 10.
> **Depende do RS-1** (banco e RPCs).

**Objetivo:** no portal, o cliente vê o site, toca no que quer mudar, descreve o ajuste e envia todos os ajustes de uma vez.

**Não entra:**

- Acompanhamento, antes e depois, e aprovação final (RS-3).
- Transcrição do áudio.

## Decisão técnica principal: onde o cliente toca

O portal não consegue "tocar dentro" de um site aberto num iframe de outro domínio: o navegador bloqueia. Por isso há dois modos.

1. **Modo visual, para sites com o módulo `paginas` (PC-4):**
   - A página é desenhada pelo próprio Hub, com as mesmas seções do editor (`src/secoes`), como no PC-4.
   - Cada seção recebe `data-secao-id` (o id do bloco).
   - O toque grava a seção e a posição em porcentagem dentro dela.
   - O marcador aparece no mesmo lugar no celular e no computador.
2. **Modo lista, para os outros sites** (feitos fora do editor, como o do Junior):
   - O cliente vê o site pelo endereço, sem marcar sobre ele.
   - "Marcar um ajuste" pede a página e a parte da página por nome ("Topo", "Contato"…), e a foto da tela é opcional.
   - O resto do fluxo é igual.

## Telas

Rotas:

- `/portal/site/revisar`: telas 01, 02 e 05;
- `/portal/site/revisar/ajuste`: telas 03 e 04;
- `/portal/site/revisar/enviar`: tela 06.

Todas com `ssr: false` e `exigirPapel` no `beforeLoad`.

### 01 · Meu site

- Mostra a prévia do site e a chamada principal "Revisar o site" (âmbar, a única da tela).
- O selo da aba "Meu site" no `PortalTabsSite` soma os ajustes "Para você ver" e os rascunhos não enviados. Usa a mesma regra do contador "Precisam de você" (a soma tem que bater).

### 02 · O que mudar aqui?

- O toque no site abre o painel de baixo com 6 opções em grade 2×3, cada uma com 44 px ou mais: Trocar texto, Trocar foto, Tirar, Mudar de lugar, Incluir algo, Outra coisa.
- O marcador aparece como quadrado com borda tinta enquanto é rascunho.

### 03 · Trocar texto

- Mostra o texto atual (só leitura) e o campo "Como deve ficar" (16 px, `inputMode="text"`).
- Tem a observação e "Gravar áudio": até 2 minutos, com ouvir, regravar e apagar. Sem microfone liberado, avisa e mantém a observação escrita.
- Ações:
  - "Salvar marcador";
  - "Mudar agora, eu mesmo", só quando `'paginas' = any(sites.modulos)`. Leva ao editor do PC-4 já na seção marcada e não cria marcador.

### 04 · Trocar foto

- Mostra a foto atual ao lado da nova.
- O envio aceita JPG, PNG ou WebP até 5 MB.
- O formato e o tamanho são conferidos **antes** do envio, com o motivo da recusa.

### Tirar, Mudar de lugar, Incluir algo e Outra coisa

- Mesmo formulário da tela 03, sem o "texto atual".
- "Mudar de lugar" pergunta "Para onde?" com a lista das seções da página.

### 05 · Sua lista de ajustes

- Lista numerada dos marcadores na ordem da página, com o tipo, a página, o resumo, e Editar e Tirar da lista (com Desfazer por 5 s em vez de confirmar).
- Barra fixa embaixo com "Enviar N ajustes": some com o teclado aberto, e a página reserva o espaço.
- Lista longa (mais de 15 itens) usa `@tanstack/react-virtual`.

### 06 · Enviar a rodada

- É um **painel de baixo** no celular e um painel lateral no computador, não um modal centralizado (regra do Hub).
- Título "Enviar a rodada N?", com a contagem e o aviso: "Ajustes fora do que combinamos podem gerar um orçamento de serviço adicional. Você aprova o valor antes de começarmos."
- A partir da 3ª rodada, troca por: "As duas rodadas incluídas já foram usadas. Estes ajustes provavelmente serão serviço adicional: mandamos o valor para você aprovar antes."
- Botões empilhados com a mesma largura: "Enviar" (âmbar) e "Voltar para a lista".

### 10 · Computador (1440 px)

- A prévia do site fica à esquerda (`flex-1`), com a troca "Computador | Celular" que muda a largura da prévia.
- O painel da lista fica à direita (`w-96`).
- Tocar num item da lista rola a prévia até o marcador e o destaca.

## Regras de interface (CLAUDE.md e canvas)

- Fontes:
  - Geist no texto, com `tabular-nums` nos números;
  - Bricolage 800 só no título principal (h1 28 px, h2 20 px).
- Nenhum texto abaixo de 12,5 px e nenhum rótulo em caixa alta.
- Âmbar só na ação principal, no máximo uma por tela.
- Botões de decisão empilhados com a mesma largura, e alvos de toque com 44 px ou mais.
- Cabeçalho de 56 px. Nas telas 05 e 06, a barra de ação substitui as abas.
- Todas as leituras e escritas usam TanStack Query, com chaves `revisao.*`.
- Salvar e tirar marcador são otimistas, com volta atrás no erro e aviso com "Tentar de novo".
- Sem rede: o texto digitado fica guardado no rascunho local até salvar.

## Critérios de aceite

- [ ] **Site com páginas no editor:** tocar no título da Capa, escolher "Trocar texto" e salvar cria o marcador 1 sobre o título. Na largura de computador, o marcador continua sobre o título (teste de componente).
- [ ] **Site sem editor:** "Marcar um ajuste" pede a página e a parte por nome, e "Mudar agora, eu mesmo" não aparece (teste).
- [ ] **Foto recusada:** foto de 6 MB ou em GIF é recusada antes do envio, com o motivo (teste).
- [ ] **Envio duplo:** "Enviar 3 ajustes" envia uma vez só, mesmo com toque duplo (teste com o RPC simulado). Depois do envio, a lista fica vazia e a tela 01 mostra "Rodada 1 enviada".
- [ ] **Selo:** o selo da aba "Meu site" é igual à soma usada em "Precisam de você" (teste).
- [ ] **Celular:** em 390 px, nada passa da largura, e a barra fixa não cobre o último item.
- [ ] `bun run build`, `bun run lint` e `bun run test` passam, com conferência no navegador em 390 e 1440 px.
