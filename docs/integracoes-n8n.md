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
