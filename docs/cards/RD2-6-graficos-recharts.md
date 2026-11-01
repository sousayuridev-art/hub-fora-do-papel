# RD2-6 · Gráficos com Recharts

Parte do redesenho RD2 (`docs/cards/RD2-redesenho-areas.md`). Decisão de 29/10: gráficos com Recharts.

## Visão de negócio
Os gráficos feitos à mão funcionavam, mas cada ajuste (dica, empilhado, previsto) era código próprio.
Com Recharts, os próximos gráficos saem mais rápido e com o mesmo comportamento.

## Requisitos
1. `GraficoBarras` e `GraficoLinha` (`src/components/hub/Graficos.tsx`) passam a usar Recharts por dentro,
   com a mesma interface: Financeiro (entradas e saídas, mensalidades), Relatórios (receita) e Tráfego pago
   (investimento, contatos) trocam sem mudar de tela.
2. Regras de visualização mantidas: um eixo só; cores `--serie-1..4` em ordem fixa; legenda com 2 séries;
   ponta de barra arredondada em 4 px; linha de 2 px; previsto listrado (padrão SVG); 2 px entre segmentos
   empilhados; dica escura ao passar o mouse ou tocar; tabela escondida para leitor de tela; rodapé por categoria.
3. Recharts carregado só pelas telas do `/app` que têm gráfico (pedaço próprio do pacote), nunca no site
   nem no portal.

## Fora deste card
- Gráficos novos no Painel (não havia gráfico lá; entra quando houver número para mostrar).

## Critérios de aceite
- [x] Build, lint e testes passam.
- [x] Conferido no navegador: barras agrupadas com previsto e rodapé, empilhadas, linha com meta, dica.
- [x] Recharts fora do pacote principal (`Graficos-*.js` separado).
