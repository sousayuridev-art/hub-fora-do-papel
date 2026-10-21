# Card RE-0 · Preparação das Reuniões no Hub

> **Origem:** documento "Reuniões no Hub: Google Meet, transcrição e IA" (21/10/2026).
> **Decisões (Yuri, 21/10):** conta Workspace da Fora do Papel organiza todas as reuniões; transcrição completa guardada até 12 meses depois do fim do contrato; aviso de gravação aprovado (revisão jurídica antes de ir ao ar); teto de IA R$ 100/mês com aviso aos 80%; workspaces da Anthropic criados (`fdp-hub`, `fdp-demos`, `cli-junior`, `cli-plamev`). Crédito de US$ 100 vence em 17/11/2026.

**Objetivo:** deixar a conta do Google e o Hub prontos para o RE-1 buscar as transcrições, sem nenhuma chave fora do servidor.

**Não entra:** código das funções (RE-1), IA (RE-2), criação de eventos pelo Hub (RE-1).

## Parte do Yuri (no Google), em ordem
1. **Plano.** Em admin.google.com › Faturamento, conferir que a conta é Business Standard ou superior (transcrição do Meet só existe a partir dele). Se não for, mudar o plano antes do resto.
2. **Transcrição ligada.** Admin › Apps › Google Workspace › Google Meet › Gravação e transcrição: transcrição ativada e, se aparecer a opção, "exigir consentimento dos participantes".
3. **Teste manual.** Fazer uma reunião de 2 minutos consigo mesmo, ligar a transcrição e conferir que o arquivo aparece no Drive (pasta do Meet) em português.
4. **Projeto no Google Cloud** (console.cloud.google.com), com a conta da Fora do Papel: criar o projeto `fdp-hub`; ativar **Google Meet API** e **Google Calendar API**.
5. **Tela de consentimento OAuth:** tipo **Interno** (só contas da Fora do Papel), nome "Hub Fora do Papel".
6. **Credencial OAuth (aplicativo da Web):** o endereço de retorno será informado no RE-1 (função do Supabase). Guardar o ID e o segredo do cliente para colar nos segredos do Supabase, nunca na conversa.

## Parte do Hub (Claude Code)
- `docs/regras-ia.md` já define chave só no servidor e teto mensal.
- Nomes dos segredos no Supabase, para o RE-1 e o RE-2: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ANTHROPIC_API_KEY_HUB` (chave do workspace `fdp-hub`), `IA_TETO_MENSAL_CENTAVOS=10000`.
- Permissões pedidas ao Google (mínimas): leitura dos registros e transcrições do Meet e criação de eventos na Agenda. Nada de Drive, Gmail ou Contatos.
- Texto do aviso no convite (aprovado, revisão jurídica pendente): "Esta reunião pode ser transcrita para registrar o que combinarmos. Se preferir que não seja, é só avisar no início." Frase no início da reunião: "Vou ligar a transcrição para não perder nada do que combinarmos, tudo bem?"

## Critérios de aceite
- Reunião de teste gerou transcrição em português no Drive da conta da Fora do Papel.
- Meet API e Calendar API ativas no projeto `fdp-hub`; tela de consentimento interna; credencial criada.
- Os três segredos cadastrados no Supabase pelo Yuri (o Claude Code só confere que existem, sem ler o valor).

## Andamento (21/10)
- Passos 1 a 3 feitos: conta yuri@foradopapel.com.br (Business Standard), transcrição em português conferida no Drive.
- Passos 4 a 6 feitos: projeto `fdp-hub` na organização foradopapel.com.br, Meet API e Calendar API, consentimento Interno, escopos `meetings.space.readonly` e `calendar.events`, cliente OAuth "Hub" (aplicativo da Web).
- A chave secreta do cliente apareceu num print da conversa; o Yuri decidiu mantê-la (app Interno). Trocar em Clientes › Hub › Adicionar chave secreta se houver qualquer suspeita.
- Feito depois: fuso da Agenda em Fortaleza; segredos `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no Supabase; endereço de retorno do RE-1 no cliente "Hub".
- Função `reunioes-google` publicada pelo painel do Supabase (verificação de JWT desligada), porque a chave do GitHub não tem permissão de publicar funções.

## Para o Yuri depois
- Avisar quando o passo 3 der certo; com os segredos cadastrados, o RE-1 começa.
