# RD2-5 · Clientes e página do cliente

Parte do redesenho RD2 (`docs/cards/RD2-redesenho-areas.md`). Aprovado no canvas (P02 Clientes e P02b Cliente).
Campo de logo aprovado em 29/10.

## Visão de negócio
A lista misturava contatos, negociações e clientes com contrato; não dava para ver de relance quem paga
mensalidade, quem está com projeto em risco ou com cobrança atrasada. A ficha tinha uns 10 cartões na primeira tela.

## Requisitos
1. Lista com abas: **Clientes ativos** (padrão), **Contatos**, **Ex-clientes** e **Arquivados**, com a contagem do banco.
   - Ativo: projeto em andamento, mensalidade ativa ou pausada, ou cobrança em aberto.
   - Ex-cliente: já teve projeto ou negócio fechado, sem nada disso hoje.
   - Arquivado: última oportunidade arquivada. Contato: o resto.
2. Ativos e ex-clientes em tabela: Empresa (logo ou sigla, contato e cidade), Relação (Projeto, Mensalidade,
   Projeto + mensalidade, Diagnóstico), Agora (cobrança atrasada > fase do projeto com saúde > pedidos abertos),
   Mensalidade, Próxima cobrança ("Venceu 19/10" em vermelho) e Última atividade. Lista virtualizada; cartões no celular.
3. Linha de resumo em Clientes ativos: mensalidades por mês, projetos em andamento, clientes com cobrança atrasada.
4. Contatos mantém o que existia: números Para hoje, Vencidos e Em negociação, filtros e ordem.
5. Página do cliente com abas **Resumo**, **Projetos e propostas**, **Reuniões** e **Linha do tempo**.
   - Resumo: à esquerda, Agora (projeto com fase, saúde e o primeiro motivo; pedidos abertos), a oportunidade aberta e
     as 4 últimas atividades; à direita, Contrato e dinheiro, Contato, Acesso ao portal e Anotações.
   - Projetos e propostas: projetos, propostas, site, peça de origem, atalhos para Materiais e Pedidos.
   - Relação no lugar da situação no cabeçalho, quando houver.
6. Logo: PNG, JPG ou WEBP até 1 MB, em "Mais > Pôr a logo". Bucket privado `logos-clientes`, endereço temporário
   de 1 hora. Trocar apaga a anterior; falha no banco apaga o arquivo enviado.
7. Tudo calculado no banco: `clientes_agora()` (só o dono) e `cliente_logo()`.

## Casos de borda
- `clientes_agora` ainda carregando: grupo aproximado pela situação (cliente → ativo).
- "Para hoje" e "Vencidos" contam todos os passos abertos, inclusive de clientes ativos (mesma regra do banco).
- Logo de outra agência ou fora do caminho do próprio cliente: recusada no Storage e na RPC.

## Fora deste card
- Botão "Nova oportunidade" para um cliente existente (não há RPC; vira card próprio se fizer falta).
- Logo nos quadros de Vendas, Projetos e Pedidos.

## Critérios de aceite
- [x] `supabase/tests/rd2_5_clientes.test.sql` (17) passa.
- [x] `src/test/rd2-5.test.ts` passa.
- [x] Build, lint e testes passam; conferido no navegador em computador e celular.

## Métrica de sucesso
Achar quem está com cobrança atrasada ou projeto em risco sem abrir nenhuma ficha.
