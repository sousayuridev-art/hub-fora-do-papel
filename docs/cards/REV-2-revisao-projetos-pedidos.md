# Card REV-2 · Revisão de Projetos e Pedidos (17/10)

**Pedido do Yuri:** revisão crítica de Projetos e Pedidos (gestor, designer, PMO, PM), corrigir por impacto e preservar o que funciona.
**Depende de:** S3.

## O que está bom
- O projeto nasce no aceite, sem digitação.
- A aprovação só acontece pela mão do cliente, e o serviço adicional só começa com o sim dele. As duas regras ficam no banco.
- O portal mostra ao cliente só o que é dele, e cada decisão fica registrada com nome, data e hora.

## Problemas e correções (por impacto)
1. **O cliente não fica sabendo** que há algo para ele (os avisos automáticos do n8n ainda não existem).
   - "Lembrar pelo WhatsApp" em "Aguardando o cliente", com a lista do que espera por ele e o endereço do portal.
   - Convite ao portal com envio pelo WhatsApp, com o endereço e o e-mail que ele deve usar.
2. **Risco das entregas escondido.** Cada projeto em andamento ganha um sinal calculado no banco (`_projeto_saude`):
   - **Risco:** lançamento atrasado; horas acima do estimado.
   - **Atenção:**
     - horas em 80% ou mais;
     - pendência do cliente atrasada;
     - aprovação parada há 3 dias ou mais;
     - ajuste pedido ainda sem nova versão;
     - sem data de lançamento;
     - lança em até 7 dias com o checklist incompleto.
   - O sinal aparece:
     - no cartão do projeto;
     - no topo da tela do projeto;
     - no Painel, na seção "Entregas que pedem atenção" (`painel_entregas`).
3. **Ajuste pedido sem caminho claro.** O aviso do ajuste traz "Enviar a nova versão", que já preenche o título e a fase. O aviso some quando a nova versão é enviada (antes ficava para sempre).
4. **Projeto sem edição.** "Editar" no cabeçalho do projeto: nome, horas estimadas e lançamento previsto, com atualização otimista.
5. **Lançar com itens em aberto.** A confirmação lista as aprovações, pendências e pedidos ainda abertos.
6. **Aprovação sem tempo de espera.** Cada aprovação mostra há quantos dias espera o cliente.
7. **Design:**
   - título do cartão do projeto clicável;
   - "0 h" no lugar de "0 min";
   - responsável do portal sem cair no nome da agência;
   - texto do serviço adicional depois de decidido.

## Fica para depois
- Horas da mensalidade usadas no mês (vai para Relatórios, S7).
- Troca de empresa ou de projeto no portal.
- Avisos automáticos pelo n8n (S6a).

## Critérios de aceite
- Um projeto com lançamento vencido aparece em "Entregas que pedem atenção" no Painel, como risco.
- O link "Lembrar pelo WhatsApp" abre a conversa com a lista dos itens que esperam o cliente.
- Verificações: build, lint, vitest e pgTAP (`supabase/tests/rev2_saude.test.sql`) passam.
