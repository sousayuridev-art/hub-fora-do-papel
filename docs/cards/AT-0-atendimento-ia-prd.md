# AT-0 · Central de Atendimento com IA · PRD

> **Origem:** conversa de 05/11/2026 sobre o Reels "Site que traz conversa". O Yuri decidiu: "a própria IA envia" o que está na base aprovada; o resto, uma pessoa decide.
> **Regra:** `docs/regras-ia.md`, item 6 (atualizado em 05/11/2026). Vale também para o site (`fora-do-papel-blueprint/docs/regras-ia.md`).
> **Piloto:** Mansão Mediterrâneo (decisão do Yuri, 05/11/2026), workspace `cli-mansao` no Console.
> **Depende de:** cliente com WhatsApp pela API (ChatGuru) e n8n já ligados ao Hub (`docs/integracoes-n8n.md`).

## Problema
Quem chega pelo site ou pelo Instagram manda mensagem no WhatsApp a qualquer hora. As perguntas simples (horário, endereço, como funciona) esperam alguém da equipe ver e responder, às vezes até o dia seguinte, e o contato esfria. As perguntas que comprometem (preço, data, reserva) não podem sair sem alguém conferir.

## Objetivos
1. Pergunta que está na base aprovada recebe resposta em poucos segundos, a qualquer hora.
2. Nenhuma resposta automática afirma algo que não está escrito numa resposta aprovada.
3. Pergunta fora da base chega para a equipe já com uma sugestão de resposta e a fonte, pronta para conferir e enviar.
4. O dono do negócio vê, por semana, quantas conversas foram respondidas sozinhas e quantas foram para a equipe.

## Não-objetivos
- A IA criar resposta nova e enviar sem ninguém ver.
- Fechar venda, reserva ou agendamento sozinha (isso pede outro card e outra decisão).
- Instagram Direct e outros canais (P2).
- Atendimento por voz.

## Histórias
- Como visitante, pergunto "qual o horário?" às 23h e recebo a resposta na hora, sabendo que falo com uma assistente virtual.
- Como visitante, peço "falar com uma pessoa" e a IA para e avisa a equipe.
- Como atendente, abro a fila e vejo a pergunta de preço com a resposta sugerida e a fonte; confiro, ajusto e envio.
- Como dono do negócio, escrevo e aprovo as respostas da base e escolho quais assuntos podem sair sozinhos.
- Como dono, vejo o que a IA respondeu sozinha ontem e corrijo uma resposta da base se algo saiu estranho.

## Requisitos
**P0**
- Base aprovada por cliente (tenant): pergunta, variações, resposta aprovada, assunto, quem aprovou e quando, "pode sair sozinha" (desligado por padrão).
- Decisão por mensagem: a IA (Haiku) diz qual resposta aprovada serve e com que certeza. Envia sozinha só se a resposta tem "pode sair sozinha", a certeza passa do limite e o assunto não está na lista de assuntos que sempre vão para uma pessoa (`docs/regras-ia.md`, item 6).
- Envio pela resposta aprovada, sem mudar o conteúdo; a IA só ajusta a abertura (cumprimento e nome).
- Primeira resposta automática da conversa se apresenta como assistente virtual. "Falar com uma pessoa" para a IA naquela conversa.
- Pessoa da equipe respondeu na conversa: a IA para de enviar sozinha nela (por um tempo definido no card AT-1).
- Fora da base ou em dúvida: sugestão para a equipe, com a fonte, sem envio.
- Registro de toda decisão (enviada sozinha, sugerida, ignorada), com a pergunta, a resposta usada e o horário; uso e custo em `ai_usage`, com teto mensal.
- Interruptor geral por cliente: desligar o envio sozinho na hora.

**P1**
- Fila da equipe no Hub e no painel do cliente com "Conferir e enviar" e "Editar".
- Resumo semanal: respondidas sozinhas, enviadas pela equipe, tempo até a primeira resposta.
- Sugerir novas perguntas para a base a partir das que caíram na fila várias vezes (o dono aprova).

**P2**
- Instagram Direct.
- Horário de atendimento: fora do horário, avisar quando a equipe volta.

## Casos de borda
- Mensagem com duas perguntas (uma na base, outra fora): não envia sozinha; vai para a equipe com as duas partes.
- Áudio, foto ou documento: não envia sozinha; vai para a equipe.
- Resposta aprovada editada pelo dono: só a versão nova sai; o registro guarda qual versão saiu.
- O mesmo evento chega duas vezes do ChatGuru: o id da mensagem impede resposta duplicada.
- Teto mensal de IA atingido: para de decidir e manda tudo para a equipe, com aviso no Painel.
- Base de outro cliente: nunca aparece (RLS por `tenant_id`).
- Pessoa irritada ou palavras de reclamação: sempre para a equipe.

## Métrica de sucesso
- Rápida: tempo até a primeira resposta nas perguntas da base (meta: segundos).
- Depois: contatos que viram conversa com a equipe e negócios fechados (MK-4), antes e depois de ligar.

## Entregas
- **AT-1** · base aprovada, decisão e envio sozinho (banco, função de servidor e n8n). Card próprio.
- **AT-2** · telas: base aprovada, fila da equipe e registro, no Hub e no painel do cliente.
- **AT-3** · resumo semanal e sugestões para a base.

## Perguntas abertas (não bloqueiam o AT-1)
- Limite de certeza para enviar sozinha: começar alto e ajustar no piloto com dados reais.
- Por quanto tempo a IA fica parada numa conversa depois que uma pessoa entra (sugestão: 12 horas).
- O texto de apresentação da assistente virtual de cada cliente é escrito com o dono.
