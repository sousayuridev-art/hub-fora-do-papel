# RD2-3 · Reuniões como agenda da semana

> Aprovado no canvas "Hub · redesign das áreas" (quadro 03 · Reuniões), com os ajustes do Yuri de 29/10:
> agenda de segunda a sexta ocupando a página toda; clicar numa reunião abre o painel lateral com os detalhes.
> Decisão de 29/10: o Hub grava na Google Agenda ("Marcar reunião").

## Visão de negócio
Hoje a tela só mostra reuniões que já aconteceram (as gravadas do Meet). O Yuri olha a Google Agenda para saber
o que vem, e o Hub para saber o contexto do cliente. Juntar os dois numa tela evita entrar na conversa sem saber
em que pé está a venda ou o projeto.

## Requisitos
1. **Aba Agenda (padrão):** semana de segunda a sexta, das 8h às 18h (alarga se houver reunião fora disso).
   Eventos da Google Agenda nos horários; hoje marcado; linha da hora atual; "Hoje", semana anterior e próxima.
   No celular: um dia por vez, com os 5 dias em botões.
2. **Clique numa reunião:** painel lateral com quando, convidados, cliente ligado (pela reunião gravada ou pelo
   e-mail de um convidado cadastrado), "Entrar no Meet" e **Para levar**: etapa e próximo passo da oportunidade,
   situação da proposta (versão, enviada, vista) e a última reunião com o cliente. Reunião já gravada mostra
   "Ver transcrição", que abre o painel de hoje.
3. **Marcar reunião:** título, cliente (opcional; o e-mail dele entra como convidado), data, hora, duração e
   convidados. Cria o evento na Google Agenda com link do Meet e convite para os convidados.
4. **Aba Gravações:** a tela atual (busca, filtros, ligar reuniões a clientes) continua igual.
5. Sem Google ligado: a agenda explica e leva a Configurações; "Marcar reunião" fica indisponível.

## Banco e servidor
- `google_conexao_ler(p_tenant)`: só o servidor; devolve a permissão cifrada sem travar a busca automática.
- `agenda_ligar(p_eventos jsonb)`: só o dono; para cada evento devolve reunião gravada, cliente, oportunidade
  aberta e proposta. Nada de outra agência.
- Função `reunioes-google`: rotas `agenda` (janela de até 8 dias) e `marcar`. A chave do Google fica no servidor.

## Casos de borda
- Evento de dia inteiro: aparece no topo do dia, fora da grade de horas.
- Evento sem convidados ou sem Meet: painel mostra só o que existe.
- Permissão do Google vencida: mensagem "Ligue de novo" com o caminho.
- Convidado com e-mail de cliente de outra agência: não liga nada.

## Critérios de aceite
- [ ] Agenda mostra a semana certa (seg–sex) e navega para semana anterior e próxima.
- [ ] Clique abre o painel; "Para levar" traz etapa, próximo passo e proposta do cliente certo.
- [ ] Marcar reunião cria o evento com Meet e ele aparece na agenda.
- [ ] Aba Gravações faz tudo o que a tela fazia antes.
- [ ] 390 px: um dia por vez, sem rolagem lateral; alvos de 44 px.
- [ ] `supabase test db`, `bun run test`, `bun run lint` e `bun run build` passam.
