# Integrações pelo n8n (fila `event_outbox`)

O Hub grava cada acontecimento importante (contato criado, etapa alterada, proposta aceita ou recusada,
cobrança paga…) na tabela `event_outbox`, na mesma transação da ação. O n8n lê a fila e repassa para
Pipedrive e ChatGuru/WhatsApp. Card REV-5.

## Como o n8n consome
1. A cada 1 minuto, chamar `outbox_reservar` com a chave **service_role** guardada nas credenciais do n8n
   (nunca no navegador, nunca em log):
   `POST {SUPABASE_URL}/rest/v1/rpc/outbox_reservar` com corpo `{"p_limite": 50}`.
2. Para cada evento devolvido, enviar ao destino.
3. Confirmar: `POST /rest/v1/rpc/outbox_confirmar` com `{"p_id": <id>}` se deu certo, ou
   `{"p_id": <id>, "p_erro": "<mensagem curta>"}` se falhou.

## Regras
- Dois fluxos rodando juntos não pegam o mesmo evento (reserva com `skip locked`).
- Evento reservado e não confirmado volta à fila depois de 5 minutos.
- Depois de 10 tentativas o evento para; conferir `last_error` e reenviar zerando `attempts` no SQL.
- O destino deve aceitar o mesmo evento duas vezes sem duplicar (usar o `id` do evento como chave).

## Eventos da Central de conteúdo (card MK-1)
| Evento | Quando | Dados |
| --- | --- | --- |
| `marketing.peca_aprovada` | a peça foi aprovada | `peca_id`, `titulo`, `canais` |
| `marketing.versao_agendada` | uma versão ganhou data | `peca_id`, `versao_id`, `canal`, `formato`, `quando` |
| `marketing.versao_publicada` | uma versão foi marcada como publicada (link colado ou publicação automática do MK-5, com `automatica: true`) | `peca_id`, `versao_id`, `canal`, `formato`, `link`, `quando`, `pilar` |
| `marketing.publicacao_falhou` | a publicação automática não saiu (MK-5) | `peca_id`, `versao_id`, `canal`, `erro` |

Sugestão para o n8n: `marketing.publicacao_falhou` → mensagem no WhatsApp do Yuri com o motivo. A publicação em si não passa pelo n8n: a função `marketing-publicar` faz o envio (MK-5).

Nenhum fluxo do n8n publica na rede: esses eventos servem para avisos. A publicação e os números são da função `marketing-publicar` (MK-5).
