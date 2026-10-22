# Card RD-9 · Acabamento das telas do Hub (22/10)

> **Pedido do Yuri em 22/10 ("FAÇA!"):** itens 1, 2, 3, 4 e 7 da lista de design do Hub (pendências das revisões do redesenho).
> **Status:** aprovado; implementação em 22/10.

## 1. Abas sempre no mesmo lugar
- Toda tela com abas usa a prop `abas` do `CabecalhoPagina` (abas na base da faixa branca do cabeçalho, alinhadas à esquerda, logo abaixo do título). Nenhuma tela monta abas soltas no corpo.
- Levantar todas as telas com abas (`grep -rn "<Abas" src`) e mover as que estão fora do cabeçalho. Abas internas de um painel lateral (Sheet) ou de um bloco da ficha continuam onde estão, mas com o mesmo componente `Abas`.
- No celular, as abas rolam de lado dentro do cabeçalho, sem quebrar linha.

## 2. Configurações: botões de ligar e desligar
- Todo `Switch` do Hub com área de toque de pelo menos 44×44 px (a área clicável inclui o rótulo da linha inteira, `label` envolvendo o controle). O visual do controle pode continuar menor.

## 3. Pedidos de ajuste: cabeçalhos da tabela
- Cabeçalhos em frase normal (sem `uppercase`, sem `tracking` largo), Poppins 13,5 px, peso 500, cor `hub-suave`, como as outras tabelas do Hub.
- Conferir outras tabelas do Hub com o mesmo problema e corrigir junto.

## 4. Gráficos: rótulos dos eixos
- Rótulos dos eixos e legendas em `Graficos.tsx` com no mínimo 12,5 px (passa de 12 para 12,5). Conferir que nada sobrepõe em 360 px.

## 7. Botão Voltar igual em todas as telas
- **Regra:** telas de detalhe (ficha do cliente, projeto, proposta aberta, tarefa aberta) mostram a migalha do `CabecalhoPagina` ("Clientes / Nome") e um botão Voltar só no celular, no canto esquerdo do cabeçalho.
- O Voltar usa o histórico quando a pessoa veio de dentro do Hub (`router.history.length` / `canGoBack`); se entrou direto pelo endereço, vai para a lista da seção (destino fixo por tela).
- Filtros e abas trocam o endereço com `replace` (não enchem o histórico); abrir um item cria entrada (como já faz a Central de Tarefas).
- Painéis laterais (Sheet) fecham com Voltar no celular quando abriram por endereço.
- Implementar como um componente `BotaoVoltar` (um por arquivo) usado pelo `CabecalhoPagina` quando há `migalha`.

## Não entra
- Mudança de cores, tipografia ou layout além do descrito.
- Ficha do projeto e portal (card RD-10).

## Critérios de aceite
- [ ] Todas as telas com abas: abas no cabeçalho, mesma posição em 1280 e 360 px.
- [ ] Switches com área de toque ≥ 44 px.
- [ ] Nenhum cabeçalho de tabela em caixa alta.
- [ ] Rótulos dos gráficos ≥ 12,5 px.
- [ ] Voltar: entrar direto em `/app/clientes/<id>` e tocar Voltar leva a `/app/clientes`; vindo da lista, volta para a lista com o filtro que estava.
- [ ] `bun run build`, `bun run lint` e `bun run test` passam.
