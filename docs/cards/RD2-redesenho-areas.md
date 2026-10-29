# Cards RD2 · Redesenho das 11 áreas do Hub

> **Aprovação (Yuri, 28 e 29/10):** canvas "Hub · redesign das áreas" (artefato de design, 15 quadros) com os ajustes pedidos:
> sem link azul sublinhado; cores por tipo e por etapa em todas as telas; colunas coloridas de altura cheia;
> listas com cartões separados; nada de buracos vazios; cabeçalho de projeto com anel de progresso e etapas.
> Gostou e fica como está: números do topo separados, prévia dos materiais, Financeiro e Relatórios.
>
> **Decisões de 29/10:** Fechado sai do quadro de Vendas; campos novos aprovados (logo do cliente, urgente no
> pedido, data por fase, tipo e valor estimado); Reuniões gravam na Google Agenda; gráficos com Recharts.
>
> **Regra geral:** nenhuma funcionalidade some. Muda a composição. Números vêm do banco. Celular primeiro.

## Visão de negócio
O painel já faz quase tudo, mas é difícil de ler: tudo tem o mesmo peso, a cor não diz nada e as ações parecem
links soltos. Meta: achar o que fazer hoje em 5 segundos em qualquer tela e operar sem procurar.

## Entregas (uma por vez, cada uma testada e publicada)
| Card | O quê | Depende |
| --- | --- | --- |
| RD2-1 | Base visual: cores por tipo, ações sem link azul, sigla com cor/logo, menu novo | — |
| RD2-2 | Vendas: funil + propostas num quadro, Fechado fora, tipo e valor estimado | RD2-1 |
| RD2-3 | Clientes, página do cliente e Reuniões (com escrita na Agenda) | RD2-1 |
| RD2-4 | Projetos (anel de progresso, etapas com data) e Pedidos (quadro, urgente) | RD2-1 |
| RD2-5 | Materiais com prévia em painel; Sites dentro de Entregar | RD2-1 |
| RD2-6 | Gráficos com Recharts no Painel, Financeiro e Relatórios | RD2-1 |

---

## RD2-1 · Base visual

### Requisitos
1. **Cores por tipo** (mesma cor em todas as telas), tokens em `styles.css`:
   Vendas `#EEF2FD/#1E3FA8` (ponto `#2448C9`), Entrega `#EAF6F0/#145A37` (`#14946A`),
   Pedidos `#F1EFFC/#4A3AA7` (`#6250D6`), Dinheiro `#FDF1E6/#8A4210` (`#E07A1F`).
   Componente `SeloTipo` com palavra (nunca só cor).
2. **Gráficos:** ordem fixa azul `#2448C9`, laranja `#E07A1F`, verde `#14946A`, violeta `#6250D6`
   (conferida para daltonismo) em `--serie-1..4`.
3. **Ações de texto sem link azul sublinhado** no Hub interno: classe `classeAcaoTexto` (texto na cor da tinta,
   fundo neutro suave, 44 px de toque) com `›` quando leva a outra tela e `⌄` quando abre ali.
   Link dentro de frase vira texto em negrito na cor da tinta, sem sublinhado.
   Fora do escopo: páginas do cliente (portal, proposta, entrada) e prévias do site, que seguem o próprio visual.
4. **Sigla do cliente com cor fixa** tirada do nome (5 tons das situações); logo quando houver (campo novo
   `clients.logo_path` entra no RD2-3).
5. **Menu** na ordem do canvas: Painel, Tarefas · Vender (Vendas, Clientes, Reuniões, Tráfego pago) ·
   Marketing · Entregar (Projetos, Pedidos de ajuste, Sites) · Gestão (Financeiro, Relatórios) · Biblioteca (Materiais).
   "Funil de vendas" e "Propostas" viram "Vendas" quando o RD2-2 juntar as telas; até lá, ficam os dois.
   "Conteúdo do site" vira "Sites" em Entregar.

### Critérios de aceite
- [ ] Nenhum `underline` nem `#1E3FA8` como cor de ação nas telas `/app/*`.
- [ ] Mesmo cliente tem a mesma cor de sigla em todas as telas.
- [ ] `bun run test`, `bun run lint`, `bun run build` passam; tela a 390 px sem rolagem lateral.

## RD2-2 · Vendas
- Quadro único com colunas Contato · Diagnóstico · Mapeamento · Proposta, coloridas de altura cheia (fundo da cor
  da etapa, cartões brancos separados). Fechado fora do quadro: contador "Fechados no mês" no topo, leva a Clientes.
- Cartão: sigla, empresa, selo do tipo, valor estimado, próximo passo com data (atrasado em risco), situação da proposta.
- Oportunidade aberta em painel lateral com a proposta dentro (sem trocar de tela).
- Banco: `deals.tipo` (site, loja, sistema, automação, ia, diagnóstico) e `deals.valor_estimado_cents`; resumo por
  coluna (quantidade e soma) em RPC.

## RD2-3 · Clientes, cliente e Reuniões
- Lista em cartões separados com sigla/logo, tipo, situação e próximo passo; página do cliente com cabeçalho novo.
- Banco: `clients.logo_path` (bucket privado, imagem até 2 MB, sem SVG).
- Reuniões: marcar no Hub grava na Google Agenda (escopo de escrita; o Yuri reconecta o Google uma vez).

## RD2-4 · Projetos e Pedidos
- Projeto: cabeçalho com anel de progresso, etapas com data prevista e real (`project_phases.due_date`).
- Pedidos: quadro com colunas coloridas por situação; `requests.urgente` com selo de risco e ordenação.

## RD2-5 · Materiais e Sites
- Prévia em painel (imagem, PDF, vídeo) sem baixar; "Sites" em Entregar reúne o site da Fora do Papel e os dos clientes.

## RD2-6 · Gráficos (Recharts)
- Trocar os gráficos próprios por Recharts carregado só no `/app` (fora do pacote do site e do portal),
  com dica ao passar o mouse, tabela para leitor de tela e as cores `--serie-1..4`.
