# Card REV-3 · Revisão geral do sistema (19/10)

> **Pedido do Yuri (19/10):** depois de Materiais, uma revisão crítica de tudo (gestor, designer, PMO e gerente de projetos), cobrindo telas, fluxos, regras de negócio, integrações e o funcionamento real. Prioridade por impacto, sem quebrar o que funciona.
> **Como foi feita:**
> - duas revisões independentes, uma de segurança e outra de produto e fluxos;
> - varredura de todas as rotas em 1440 px e 390 px, com dono, cliente e visitante;
> - testes de ponta a ponta com envio real de arquivos.

## Entrou nesta rodada (alto impacto)

| # | Problema | Ajuste |
|---|---|---|
| 1 | Ao lançar o projeto, as partes "na entrega" ficavam sem data, fora do "a receber" e do atraso | `projeto_lancar` dá vencimento em 3 dias; a confirmação avisa |
| 2 | O Painel só mostrava o funil: atrasos, avisos de pagamento e adicionais aprovados dependiam de memória | `painel_fila` e a seção "Dinheiro e serviços adicionais"; o contador do topo soma tudo |
| 3 | Projeto sem volta quando o cliente desiste | `projeto_cancelar` com prévia. Cancela cobranças abertas, mensalidade, aprovações, pendências e pedidos abertos, e pede motivo |
| 4 | Encerrar mensalidade era 1 clique, e o portal seguia dizendo "Mensalidade" | Confirmação; ao encerrar, o projeto vai para concluído |
| 5 | Conta vencida não aparecia no "Precisa de você" do cliente | `portal_pendencias.pagamentos`, selo em Pagamentos, número no resumo e item em "Precisa da sua ação"; a soma bate com os selos |
| 6 | "Fechado no mês" diferente entre Painel e Relatórios; valor editável depois do aceite | Painel usa a proposta aceita; o valor fica travado (`deals_valor_do_aceite`) |
| 7 | Telas ligadas sem levar o cliente junto | Financeiro e Pedidos com `?cliente=`; ficha com "Pedidos deste cliente" e "Materiais deste cliente"; cobrança com links para a ficha e o projeto |
| 8 | Serviço adicional recusado depois de pago | Aviso antes de recusar; evento `adicional_pago_recusado` na fila do Painel por 30 dias |
| 9 | Enviar adicional ao cliente sem confirmar o valor | Passo de confirmação com valor e horas |

### Segurança
- **Fila de integrações:** ninguém logado consegue esvaziá-la ou alterá-la (`event_outbox` sem insert/update/delete/truncate). Nenhuma tabela aceita TRUNCATE de quem está logado.
- **Proposta reaberta:** troca o link; o link antigo encaminhado deixa de valer.
- **Materiais (S8):**
  - quem perdeu o acesso não confirma envio;
  - material na lixeira não recebe arquivo;
  - o cliente não envia SVG;
  - SVG e texto sempre baixam, nunca abrem no navegador;
  - a edição não liga um arquivo do cliente ao projeto de outra empresa;
  - título curto usa o nome do arquivo;
  - nome só de pontos é recusado.

### Pequenos
- Ficha do cliente sem rolagem lateral no celular.
- Selo das abas do portal com 12,5 px.
- Pix copia e cola com 16 px no celular.
- Link de Configurações com alvo de 44 px.
- Menu "Pedidos de ajuste" (igual ao título da tela).
- "Mover de etapa" some da oportunidade fechada.
- Resumo do portal com 3 números que somam o total; "pedidos em andamento" fica numa linha à parte.

## Fica para depois (com motivo)
- **Consumidor do `event_outbox` (n8n):** é o card S6. Nenhum aviso automático chega ao cliente ainda.
- **Mensalidades geradas uma vez por dia (`pg_cron`):** hoje são geradas quando o Financeiro ou o portal abrem. Precisa ligar a extensão no Supabase.
- **Limpeza de envios não concluídos em Materiais:** precisa do mesmo agendamento.
- **Portal com dois projetos ao mesmo tempo:** hoje mostra o mais recente.
- **Barra fixa no adicional no celular.**
- **Encerrar a relação com o cliente:** remover acessos e ver o que fica em aberto.
- **Financeiro paginado no banco.**
- **`painel_novidades` reescrita inteira:** hoje é ajustada por troca de texto.
- **IP do formulário do site:** conferir em produção qual cabeçalho o Supabase envia.
- **Desfazer "Marcar como pronto" e "Enviar ao cliente":** hoje só há a confirmação.

## Critérios de aceite
- pgTAP: `supabase/tests/rev3_revisao.test.sql` (19) e `s8_materiais.test.sql` (27) passam, junto com os demais.
- e2e REV-3 (14 verificações) e S8 (26) passam sem erro de página.
- Build, lint e vitest passam.
