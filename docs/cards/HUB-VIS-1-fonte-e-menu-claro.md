# Card HUB-VIS-1 · Fonte mais amigável e menu lateral claro

> Pedido do Yuri em 16/10, depois de entrar no Hub publicado: "família tipográfica mais amigável, semelhante à do sistema da Plamev" e "barra lateral mais moderna, leve e intuitiva, mantendo a identidade da Fora do Papel".
> Substitui, só no Hub e no portal, a fonte de texto e de rótulos e o menu escuro da proposta 2 (card S1, item 2). O site não muda.

## Visão de negócio
O Hub é usado o dia inteiro. Uma fonte arredondada e um menu claro cansam menos a vista e deixam o sistema com cara de produto pronto, o que também conta quando o cliente abrir o portal.

## Requisitos
1. **Fonte:** Plus Jakarta Sans (Google Fonts, `display=swap`, pesos 400, 500, 600 e 700) para texto, títulos e rótulos. Bricolage Grotesque fica só no nome "Fora do Papel" ao lado do símbolo. Geist e IBM Plex Mono deixam de ser carregadas no Hub.
2. **Menu lateral claro (computador, 264 px):**
   - Fundo branco, borda direita suave, sem bloco escuro.
   - Topo: símbolo + "Fora do Papel" + "Hub"; campo "Buscar…" com fundo cinza claro e atalho Ctrl K.
   - Grupos com título em letra normal (Vender, Entregar, Biblioteca, Gestão), sem caixa alta.
   - Itens com 44 px de altura, ícone + nome, cantos arredondados; item ativo com fundo #F1F1EC, texto #0E1013 e ícone em destaque. Amarelo continua só na ação principal.
   - Telas ainda não construídas mostram o selo "Em breve" no menu.
   - Rodapé: Configurações e um cartão com a conta (iniciais, nome, "Sair").
3. **Celular:** a gaveta usa o mesmo menu claro.
4. **Regras do projeto:** atualizar "Visual do Hub" no `CLAUDE.md` com a nova fonte.

## Fora do escopo
Telas internas (funil, clientes, ficha) e cores de situação não mudam; só herdam a nova fonte.

## Critérios de aceite
- Painel, Funil, Clientes e Ficha abrem com a nova fonte e sem texto cortado (computador 1440 px e celular 390 px).
- Menu claro com item ativo visível, foco por teclado visível e alvos de toque de 44 px.
- `bun run build`, `bun run lint`, testes e e2e locais passam.
