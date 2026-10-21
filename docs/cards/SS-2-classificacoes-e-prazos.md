# Card SS-2 · Classificações novas e prazos de resposta

> **Origem:** documento "Sistemas sob medida" (21/10/2026), seção 3. **Depende de:** SS-1.
> **Decisão (Yuri, 21/10):** prazos de primeira resposta dependem do plano de mensalidade; tabela abaixo aprovada.

## Visão de negócio
Todo pedido do cliente vira uma decisão clara: sem custo (garantia ou escopo), horas da mensalidade, serviço adicional ou nova proposta. Pedido grande vira oportunidade no funil, e o prazo de resposta de cada plano vira argumento para subir de plano. Métrica: receita de serviços adicionais e novos módulos vinda de pedidos, por mês.

## Escopo
1. **Gravidade** no pedido de ajuste: "Impede o trabalho", "Atrapalha", "Pequeno" (só para erros).
2. **Classificações novas** nos Pedidos de ajuste, além de escopo, mensalidade e serviço adicional:
   - **Correção na garantia:** sem custo.
   - **Novo módulo:** cria uma oportunidade no funil com o pedido anexado.
   - **Não vamos fazer:** encerra com explicação.
3. **Sugestão automática** (o Yuri confirma):
   - erro em módulo publicado, dentro da garantia (que conta da publicação final, SS-1) → Correção na garantia;
   - fora da garantia → Mensalidade, se houver plano com horas, senão Serviço adicional.
4. **Prazo de primeira resposta** por plano e gravidade, em horário comercial (seg a sex, 8h às 18h, fuso da agência):

   | Plano | Impede o trabalho | Atrapalha | Pequeno |
   | --- | --- | --- | --- |
   | Sem mensalidade (só garantia) | 1 dia útil | 3 dias úteis | 5 dias úteis |
   | Essencial | 8 horas úteis | 2 dias úteis | 5 dias úteis |
   | Evolução | 4 horas úteis | 1 dia útil | 3 dias úteis |
   | Parceria | 2 horas úteis | 8 horas úteis | 2 dias úteis |

   - O prazo fica guardado no plano (configurável em Configurações › Preços), não fixo no código.
   - O pedido mostra "Responder até" e entra no topo da fila do Painel quando falta 1 hora útil ou já venceu.
   - Primeira resposta = primeira mensagem ou mudança de situação feita pelo Yuri.
5. **Novo módulo vira oportunidade:** etapa Contato, linha "Sistemas", próximo passo "Montar proposta do módulo" e o pedido ligado. Se o módulo tiver mensalidade, a proposta já mostra o novo valor.
6. **Relatórios:** tempo até a primeira resposta por plano e gravidade (calculado no banco).

## Não entra
- Abrir pedido pelo sistema do cliente (SS-3/SS-4). Avisos por WhatsApp (n8n, CX-10).

## Critérios de aceite
- [ ] Erro em módulo publicado há 10 dias (projeto ainda sem publicação final) sugere "Correção na garantia".
- [ ] Prazo "Responder até" respeita fim de semana e horário comercial (teste com sexta 17h).
- [ ] "Novo módulo" cria oportunidade no funil uma vez só.
- [ ] Testes de banco: cliente de outra empresa não vê prazos nem classificação.
- [ ] Build, lint, testes passam.

## Texto para o cliente
"Serviço adicional" e "nova proposta", nunca "aditivo".
