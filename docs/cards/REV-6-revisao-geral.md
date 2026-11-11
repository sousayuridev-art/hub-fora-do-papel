# REV-6 · Revisão geral do Hub (11/11/2026)

> Origem: Yuri, 11/11/2026 ("revisão geral no hub… melhorias de processos, design, texto que podem não ser necessários"). Revisão feita no Hub publicado (Chrome, conta do dono). Resposta do Yuri à revisão: "Faça tudo".

## Problema

A revisão achou quatro grupos de problemas:

- **Erros de tela:**
  - a capa de Sites mostra os `**` do negrito;
  - Novidades diz "pelo portal" para pedido feito pelo sistema ou pela revisão do site;
  - o cartão de Vendas repete o nome do contato quando ele é igual ao da empresa;
  - "Fechado no mês R$ 0 · 2 contratos" esconde que os contratos estão sem valor.
- **Números que confundem:**
  - "▼100% sobre outubro" quando um dos meses é zero;
  - taxa de ganho de 67% calculada com 3 casos;
  - a Central de conteúdo mistura "no mês" e "30 dias";
  - "Custo por contato" aparece duas vezes;
  - "Horas desta semana" aparece vazio.
- **Navegação:**
  - os 12 itens do menu não cabem numa tela de notebook (730 px de altura);
  - o sobretítulo repete o grupo do menu;
  - Reuniões mostra a grade da semana em branco;
  - Configurações termina com um teste técnico ("Testar conexão") no caminho do dia a dia.
- **Processo:**
  - 10 tarefas atrasadas, que precisam ser remarcadas uma a uma;
  - o projeto zerado não diz o que fazer quando o projeto foi fechado fora do Hub.

## O que muda

1. **Sites:** o título da capa mostra o negrito em âmbar, sem os `**`.
2. **Novidades:** o texto do pedido diz a origem: pelo sistema, pela revisão do site, pelo painel do site ou pelo portal.
3. **Vendas:**
   - o cartão só mostra o nome do contato quando ele é diferente do nome da empresa;
   - a variação do "Ganhas" some quando um dos meses é zero;
   - a taxa de ganho só aparece com pelo menos 5 oportunidades decididas em 90 dias; antes disso, o cartão mostra "N de 5".
   - Para isso, o banco ganha o campo `decididos_90` em `funil_resumo` (migração `20261111100000_rev6_numeros_honestos.sql`).
4. **Painel:** quando há contratos fechados sem valor, "Fechado no mês" diz "N contratos sem valor registrado".
5. **Central de conteúdo:**
   - o cartão passa a se chamar "Publicações no mês" ("uma por canal");
   - a linha de resumo repetida sai.
6. **Tráfego:**
   - sai o parágrafo grande "R$ … esta semana", que repetia o cartão;
   - o gráfico passa a se chamar "Custo por contato, semana a semana".
7. **Projetos:**
   - a lista vazia de "Em andamento" explica de onde vêm os projetos e oferece "Cadastrar o projeto ›";
   - "Horas desta semana" só aparece quando há horas.
8. **Cabeçalho das páginas:** sem sobretítulo (o grupo já está no menu). As frases de resumo de Sites e Sistemas saem.
9. **Menu do Hub:** em telas de até 820 px de altura (computador):
   - os itens ficam com 36 px de altura;
   - os nomes dos grupos viram um fio (o nome continua para o leitor de tela);
   - o espaço entre os grupos diminui.

   No celular nada muda (alvos de 44 px).
10. **Reuniões:** semana sem reuniões mostra "Nenhuma reunião nesta semana" com "Marcar reunião ›", no lugar da grade vazia.
11. **Configurações:**
    - o teste de conexão fica recolhido em "Avançado", no fim da página;
    - o aviso de preços fica numa frase só.
12. **Tarefas:** o grupo "Atrasadas" ganha "Mudar o prazo ⌄", com as opções:
    - todas para hoje;
    - todas para amanhã;
    - todas para a próxima segunda.

    Cada tarefa passa pela RPC `tarefa_editar`. A mudança aparece na hora e volta atrás se o banco recusar.

## O que não muda

- O desenho do topo e as cores do Hub.
- As regras de cálculo do banco, exceto o campo novo `decididos_90`.
- O celular (o menu compacto vale só no computador baixo).

## Fica com o Yuri (dados que não inventamos)

- **Cliente de teste "Yuri Sousa Nascimento":** as cobranças dele entram em "A receber" e "Atrasado".
  - Cancelar as cobranças não tem volta e gera evento para o n8n. Por isso, isso fica para o Yuri decidir.
  - Arquivar a oportunidade não tira as cobranças dos números.
- **Junior, OSAB e Mansão:** cadastrar os projetos com valor, mensalidade e prazos reais.
- **Plamev:** mensalidade e infraestrutura.
- **RM Telecom:** está como cliente ativo, mas a oportunidade foi arquivada e há um diagnóstico de R$ 2.000 vencido.

## Critérios de aceite

- [x] Semana sem reuniões mostra o aviso com "Marcar reunião", sem a grade (teste).
- [x] "Mudar o prazo" oferece hoje, amanhã e a próxima segunda, com datas certas (teste).
- [x] `funil_resumo` devolve `decididos_90`. A troca do texto da função foi conferida num Postgres 16 local a partir da versão do RD-2.
- [x] `bun run build`, `bun run lint` (sem erros) e `bun run test` passam.
- [ ] Conferência no Hub publicado: menu em 730 px, Reuniões, Configurações e Tarefas.

## Registro

- **Testes:** 40 arquivos e 263 testes passando. Build sem erros. Lint sem erros (9 avisos antigos).
- **Banco:** o `supabase test db` completo não rodou: o ambiente novo não tem a Supabase CLI nem o pgTAP. Por isso, a migração foi conferida isolada (a troca de texto encontra o ponto e grava `decididos_90`).
