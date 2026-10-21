# Card RE-1 · Reuniões no Hub

> **Origem:** documento "Reuniões no Hub: Google Meet, transcrição e IA" (21/10/2026), plano item 2.
> **Depende de:** RE-0 (feito em 21/10: conta yuri@foradopapel.com.br, projeto `fdp-hub`, cliente OAuth "Hub", segredos `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no Supabase).

## Visão de negócio
Toda reunião com cliente organizada pela Fora do Papel entra sozinha no Hub, com a transcrição, ligada ao cliente, à oportunidade e ao projeto. É a base do RE-2 (sugestões da IA): sem reunião ligada ao cliente certo, não há contexto. Meta: nenhuma reunião transcrita fica fora do Hub.

## Escopo
1. **Ligar o Google (Configurações).** Seção "Google Meet e Agenda": situação (ligado como e-mail, última busca, erro), botões "Ligar ao Google" / "Ligar de novo", "Buscar agora" e "Desligar".
   - A permissão do Google (token de renovação) fica só no servidor, **cifrada** (AES-GCM com chave derivada do `GOOGLE_CLIENT_SECRET`). Nunca vai ao navegador nem a log.
   - Escopos: `meetings.space.readonly`, `calendar.events` (leitura dos eventos para achar participantes), `openid`, `email`.
   - Só o dono da agência liga, busca e desliga. O pedido de ligação usa um código de uso único que vence em 10 minutos.
   - Ligação em duas etapas: o Google devolve a permissão para o pedido, e ela só vira conexão quando quem pediu confirma no Hub com o próprio login (`google_confirmar`). Uma permissão dada no navegador de outra pessoa nunca entra na agência errada.
   - `calendar.events` (leitura e escrita) fica porque o RE-1b vai criar eventos; nesta etapa o Hub só lê.
2. **Busca automática a cada 15 minutos** (pg_cron no Supabase chama a função de servidor `reunioes-google`), mais o botão "Buscar agora".
   - Lê no Meet as reuniões encerradas (primeira vez: últimos 30 dias; depois: desde a última busca menos 48 h), as transcrições prontas e as falas (quem falou, minuto, texto).
   - Acha o evento da Agenda pelo código da reunião para pegar título e e-mails dos convidados.
   - Cada reunião entra uma vez só (registro do Meet único por agência); transcrição já guardada não é baixada de novo.
   - Reunião encerrada há mais de 2 horas sem transcrição fica como "Sem transcrição".
   - Busca automática não roda de novo antes de 10 minutos desde a última **tentativa**, com ou sem erro (protege a cota do Google mesmo se alguém chamar o endereço em laço).
   - No máximo 15 reuniões por busca (cabe no tempo da função); o resto entra na seguinte.
   - Permissão revogada ou vencida: a conexão fica "Ligar de novo" e a Configurações avisa.
3. **Vínculo com o cliente.**
   - Automático pelos e-mails dos convidados (fora os da agência): e-mail da ficha, e-mail de cobrança ou quem tem acesso ao portal. Um cliente só → liga; também liga a oportunidade aberta e o projeto em andamento quando houver exatamente um.
   - Nenhum ou mais de um cliente → fica em "Sem cliente" para o Yuri ligar com um clique.
   - Ligação manual valida que cliente, oportunidade e projeto são da mesma agência e do mesmo cliente.
4. **Tela Hub › Reuniões** (menu Vender): lista com data, duração, cliente e situação; filtros Todas, Sem cliente, Sem transcrição. Abrir uma reunião abre painel lateral com dados, vínculo e transcrição (lista virtualizada).
5. **Ficha do cliente:** aba "Reuniões" com as reuniões ligadas a ele.
6. **Evento** `reuniao.transcrita` e `reuniao.vinculada` na `event_outbox`.

## Não entra
- IA e sugestões (RE-2). Marcar reunião pelo Hub com código no evento (RE-1b). Aviso em tempo real do Workspace (RE-5).
- Apagamento automático após 12 meses do fim do contrato (card de guarda antes de completar 12 meses de dados).
- Portal do cliente: nunca mostra reunião nem transcrição.

## Segurança
- Tabelas com `tenant_id` e RLS: só o dono da agência lê `meetings` e `meeting_transcripts`; ninguém grava direto (só RPC).
- `google_connections` e `google_oauth_states`: RLS ligada, sem policy e sem permissão para `anon`/`authenticated` (só o servidor).
- Gravação de reunião pela RPC `reuniao_gravar` (só `service_role`), que liga o cliente e grava o evento na mesma transação.
- Token cifrado com a agência como dado associado: a cifra de uma agência não abre em outra.
- Revisão de segurança (21/10, revisor separado): sem achados críticos; os dois médios (ligação no navegador errado e busca em laço após falha) foram corrigidos antes de publicar. Ficaram registrados como baixos: chave da cifra derivada do segredo do cliente OAuth (trocar o segredo pede "Ligar de novo"), `localhost` aceito como volta e endereço de produção fixo na migração do agendamento.
- Endereço de retorno do Google: `https://cjzzbpqwlpjvlawllfqy.supabase.co/functions/v1/reunioes-google/retorno` (o Yuri cola no cliente OAuth "Hub").

## Casos de borda
- Convidado com e-mail de dois clientes → sem vínculo automático.
- Reunião sem evento na Agenda (sala aberta direto no Meet) → entra sem título ("Reunião de 21/10") e sem convidados.
- Participante pelo telefone ou anônimo → fala com o nome que o Meet der, ou "Participante".
- Duas buscas ao mesmo tempo → a segunda não faz nada (trava da conexão).
- Código de ligação usado duas vezes ou vencido → recusa e volta para Configurações com aviso.
- Google desligado no meio da busca → para, marca "Ligar de novo".

## Critérios de aceite
- [ ] Ligar ao Google pelas Configurações e voltar com "Google ligado como yuri@foradopapel.com.br".
- [ ] A reunião de teste de 21/10 aparece em Reuniões com a transcrição em português.
- [ ] Reunião com convidado de um cliente entra ligada a ele; sem cliente cai em "Sem cliente" e liga com um clique.
- [ ] Cliente de outra agência e pessoa do portal não veem reunião nem transcrição (teste de banco).
- [ ] Token nunca aparece em resposta ao navegador, log ou tabela legível pelo app.
- [ ] `bun run build`, `bun run lint`, `bun run test` e testes de banco passam; revisão de segurança por revisor separado.

## Métrica
Reuniões transcritas no Meet que entraram no Hub (meta: todas) e reuniões que ficaram mais de 2 dias em "Sem cliente".
