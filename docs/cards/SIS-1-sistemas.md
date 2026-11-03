# SIS-1 · Sistemas sob medida (Entregar > Sistemas)

Pedido do Yuri (03/11/2026): "criar outro menu em Entregar, só que para os sistemas sob medida, no mesmo formato que está hoje o de Sites". Hoje existe 1 sistema no ar: o da Plamev.

## Visão de negócio
Projetos mostra a obra enquanto ela acontece. Depois que o sistema vai ao ar, ele some da vista, e é aí que a mensalidade precisa se justificar: o sistema está no ar, o cliente está usando, nada da infraestrutura vai vencer. Este menu responde "o que cada cliente tem rodando, quanto nos custa e o que pede atenção".

## Requisitos (primeira versão)
1. Menu **Sistemas** em Entregar, abaixo de Sites.
2. Lista `/app/sistemas`, no formato da central de Sites:
   - números do topo: no ar, pedem atenção, mensalidades desses clientes, nosso custo de infraestrutura por mês (somados no banco);
   - filtros: Todos, No ar, Em construção (inclui "Em teste"), Pedem atenção;
   - cartão: print da tela principal (sem print, moldura escura com nome e endereço), cliente, situação, 3 números (mensalidade ou fase do projeto, pedidos abertos, custo por mês) e o aviso principal;
   - botão "Novo sistema" (painel lateral).
3. Página `/app/sistemas/$id` com as abas **Visão geral** e **Infraestrutura**:
   - Visão geral: print da tela (enviar, trocar, tirar), todos os avisos, cliente, projeto, endereços de produção e teste (abrir e copiar), no ar desde, mensalidade, pedidos de ajuste (link filtrado), para que serve;
   - Infraestrutura: serviços (nome, para que serve, custo por mês, quem paga, vencimento, endereço do painel), com totais "nós pagamos" e "o cliente paga" vindos do banco. **Nunca senhas nem chaves.**
   - Ações do topo: "Editar dados" e "Abrir o sistema" (âmbar, quando há endereço de produção).
4. Situações: Em construção, Em teste, No ar, Pausado. Ao passar para "No ar", grava a data.
5. Avisos (banco, `sistemas_resumo`), em ordem: cobrança do cliente atrasada; serviço vencendo em até 30 dias (ou vencido); no ar sem endereço de produção; pedidos de ajuste abertos.
6. Plamev: a migração cria o "Sistema Plamev" (No ar) se existir um cliente com "Plamev" no nome, ligado ao projeto dele. O Yuri completa endereço, print e serviços.

## Dados e segurança
- Tabelas `sistemas` e `sistema_servicos`, com `tenant_id` e RLS (só o dono lê). Escrita só por RPC (`sistema_salvar`, `sistema_capa`, `sistema_servico_salvar`, `sistema_servico_apagar`), que exigem o código do app (aal2). Eventos `sistema.criado` e `sistema.situacao` em `event_outbox`.
- Um sistema por projeto; projeto precisa ser do mesmo cliente; endereços só `https://`.
- Print da tela no bucket privado `logos-clientes`, pasta do cliente (`{client_id}/sistema-*.webp`), comprimido no navegador (até 1 MB). As policies do RD2-5 já limitam ao dono.
- Dinheiro em centavos.

## Fora desta versão
"Quem usa" (pessoas do cliente com acesso ao sistema), "Versões e entregas", monitoramento automático de "está no ar" e a visão do cliente no portal. Entram quando houver mais sistemas ou pedido do Yuri.

## Critérios de aceite
- [ ] O menu Sistemas aparece em Entregar; a Plamev aparece na lista como "No ar" (se o cliente existir com esse nome).
- [ ] "Novo sistema" cria e abre a página do sistema; "Editar dados" salva cliente, projeto, situação, endereços e descrição.
- [ ] Enviar o print troca a capa do cartão e da página; "Tirar" volta para a moldura.
- [ ] Incluir, editar e apagar serviço atualiza a lista e os totais; o vencimento em até 30 dias aparece como aviso no cartão.
- [ ] Cliente e dono de outro tenant não leem nada; escrita direta nas tabelas é recusada (teste `sis1_sistemas.test.sql`).
- [ ] Funciona a 360 px (sem sobreposição, alvos de 44 px).

## Métrica de sucesso
Nenhum serviço de sistema vencendo sem aviso; custo de infraestrutura de cada sistema conhecido ao renovar a mensalidade.

## Arquivos
`supabase/migrations/20261103100000_sis1_sistemas.sql`, `supabase/tests/sis1_sistemas.test.sql`, `src/lib/sistemas.ts`, `src/components/sistemas/` (CapaDoSistema, SistemaCartao, SistemaPainel, SistemaVisaoGeral, SistemaServicos), `src/routes/app/sistemas/index.tsx`, `src/routes/app/sistemas/$id.tsx`, `src/components/layout/navegacao.ts`, `src/test/sis-1.test.ts`.
