# Card AT-1 · Base aprovada e envio sozinho

> **Origem:** PRD `docs/cards/AT-0-atendimento-ia-prd.md`, entrega AT-1.
> **Decisões:** Yuri, 05/11/2026: a IA envia sozinha o que está na base aprovada; o resto, uma pessoa decide (`docs/regras-ia.md`, item 6). Envio sozinho desligado por padrão, ligado pelo dono por resposta.

**Objetivo:** uma mensagem de WhatsApp que bate com uma resposta aprovada e liberada recebe essa resposta em segundos, sem ninguém tocar; qualquer outra vira sugestão registrada para a equipe.

**Não entra:**
- telas (AT-2): neste card a base é preenchida por RPC e conferida nos testes;
- resumo semanal e sugestões para a base (AT-3);
- Instagram Direct e mensagens que não são texto (vão para a equipe sem decisão da IA).

## Requisitos

### Banco (`supabase/migrations/[data]_at1_atendimento.sql`)
- `at_respostas`: `tenant_id`, `assunto`, `pergunta`, `variacoes text[]`, `resposta`, `versao int`, `envia_sozinha boolean default false`, `aprovada_por`, `aprovada_em timestamptz`, `ativa`. RLS por `tenant_id`; o dono lê; escrita só por RPC.
- `at_conversas`: `tenant_id`, `contato` (id do ChatGuru, nunca o número em texto aberto no log), `ia_parada_ate timestamptz`, `apresentada boolean`, `pediu_pessoa_em`.
- `at_decisoes`: `tenant_id`, `conversa_id`, `mensagem_externa_id` (único por tenant: evita resposta duplicada), `pergunta`, `resposta_id`, `resposta_versao`, `certeza numeric`, `situacao` (`enviada_sozinha | sugerida | para_equipe`), `motivo`, `texto_enviado`, `criada_em`.
- `at_config` por tenant: `ligado boolean default false`, `limite_certeza numeric`, `pausa_depois_de_pessoa interval default '12 hours'`, `apresentacao text`.
- RPCs do dono (security definer, aal2): `at_resposta_salvar`, `at_resposta_liberar(p_id, p_envia_sozinha)` (aprovar grava quem e quando), `at_config_salvar`.
- RPCs da chave de serviço: `at_preparar(p_tenant, p_contato, p_mensagem_id, p_texto)` devolve as respostas ativas, a config e o estado da conversa, e reserva o uso de IA (como `mkt_ia_preparar`); `at_registrar(...)` grava a decisão e o uso em `ai_usage`, e o evento `atendimento.enviar` ou `atendimento.para_equipe` em `event_outbox`.
- Assuntos que sempre vão para a equipe ficam numa lista no banco (preço que não está na base, data, reserva, reclamação, cancelamento, cobrança, saúde, dados pessoais). A regra está no banco, não só na instrução da IA.

### Função de servidor (`supabase/functions/atendimento-ia`)
- Chamada pelo n8n quando chega mensagem do ChatGuru, com segredo próprio (como `marketing-publicar`).
- Haiku com instruções fixas em cache e resposta em JSON forçado: `resposta_id`, `certeza`, `assunto`, `motivo`.
- Envia sozinha só se: `ligado`, a resposta tem `envia_sozinha`, `certeza >= limite_certeza`, o assunto não está na lista da equipe, a mensagem tem uma pergunta só, a conversa não está parada e a pessoa não pediu atendente.
- Texto enviado: abertura curta (cumprimento + nome, se houver) + a resposta aprovada sem mudança. Na primeira resposta automática da conversa, antes a `apresentacao` (assistente virtual + "digite PESSOA para falar com alguém").
- "pessoa", "atendente" ou "falar com alguém": para a IA na conversa e manda para a equipe.
- Erro da IA, teto atingido ou tempo esgotado: `para_equipe`, nunca envio.
- Nada de chave, número de telefone ou texto da conversa em log.

### n8n
- Fluxo novo: ChatGuru (mensagem recebida) → `atendimento-ia` → se `enviar`, ChatGuru envia o `texto_enviado`; se `para_equipe`, avisa a equipe no ChatGuru com a sugestão.
- Mensagem enviada por uma pessoa no ChatGuru → `at_conversas.ia_parada_ate` = agora + pausa.
- Documentar em `docs/integracoes-n8n.md`.

## Critérios de aceite
- Dada a resposta "Horário" liberada para envio sozinho, quando chega "que horas vocês abrem?", então sai a resposta aprovada sem mudança de conteúdo e a decisão fica `enviada_sozinha`.
- Dada a mesma pergunta com `envia_sozinha` desligado, então a decisão fica `sugerida` e nada é enviado.
- "Quanto custa o fim de semana?" sem resposta aprovada de preço: `para_equipe`, nada enviado.
- Mensagem com duas perguntas, áudio ou foto: `para_equipe`.
- A mesma mensagem do ChatGuru chegando duas vezes gera uma decisão só.
- Depois de uma pessoa responder na conversa, a IA não envia sozinha nela até o fim da pausa.
- "Quero falar com uma pessoa": IA para na conversa e a equipe é avisada.
- Teto mensal atingido: tudo vai para a equipe e o Painel avisa.
- Dono de outro tenant não lê nem altera base, conversas ou decisões de outro (pgTAP).
- Sem o segredo, a função responde 401.
- `supabase test db`, `bun run build`, `bun run lint` e `bun run test` passam; testes da lógica da decisão em `src/test/atendimento-ia-logica.test.ts`.

## Para o Yuri depois de publicar
- Piloto na Mansão Mediterrâneo: escrever com a dona as primeiras respostas da base (comece por horário, endereço, como funciona e link do site).
- Workspace `cli-mansao` no Console, com limite de gasto, e a chave nos segredos do Supabase (não passa pelo chat).
- Ligar o envio sozinho resposta por resposta, olhando o registro dos primeiros dias.
- Política de privacidade e contrato do cliente: atendimento com assistente virtual e Anthropic como operadora (LGPD).
