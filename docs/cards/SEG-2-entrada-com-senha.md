# SEG-2 · Entrada do cliente com e-mail e senha

Pedido do Yuri (02/11/2026): "quero retirar isso de ter que enviar para o e-mail para ter acessos. Quero acessar com e-mail e senha normal."
Decisões: primeiro acesso por **link enviado pelo WhatsApp** (gerado no Hub); "esqueci a senha" por **e-mail de redefinição**.

## Visão de negócio
Hoje o cliente só entra com o link mágico, que chega por e-mail a cada acesso: atrito, e-mail no spam, cliente que desiste de aprovar. Com senha, ele entra direto, o gerenciador de senhas do celular preenche, e o link por e-mail fica só para criar ou trocar a senha.

## Requisitos
1. `/entrar`: e-mail + senha (`signInWithPassword`), com "Mostrar a senha". Erro de login na própria tela ("E-mail ou senha não conferem."). Sai o link mágico como forma de entrar.
2. "Primeiro acesso ou esqueceu a senha?" em `/entrar`: pede o e-mail e manda um link que abre "Crie sua senha" (`/entrar/senha?tipo=nova`). Mesma resposta para qualquer e-mail (não revela quem tem conta).
3. Tela "Crie sua senha" (`/entrar/senha`): só com a sessão aberta pelo link; senha com o mínimo do SEG-1 (12 caracteres) e medidor de força; repetir a senha; depois abre o portal (o convite é aceito ali, como antes). Conta com app autenticador (gestor) vai para a tela de segurança, onde a troca exige o código.
4. Hub, Acesso ao portal do cliente:
   - o botão de enviar de um convite gera o **link de primeiro acesso** e abre o painel de envio (WhatsApp ou e-mail) com a mensagem "Crie sua senha por este link…";
   - quem já entra mas ainda não criou a senha aparece com "Ainda não criou a senha" e um botão (chave) para gerar o link.
5. Função de servidor `portal-acesso` (chave de serviço só nela): o banco confere o pedido (`portal_primeiro_acesso`) e o Auth gera o link **sem mandar e-mail**. Conta nova = convite; conta sem senha = link mágico. Vai ao navegador só o token com hash e o tipo.

## Segurança (regra que impede tomar a conta de alguém)
- Só o dono do tenant, com o código do app (aal2), e só para e-mail com convite aberto ou acesso desta empresa.
- Só conta em que a pessoa **nunca criou senha**. A marca é nossa (`portal_senha_criada`, por gatilho na troca de senha em `auth.users`): o Auth grava uma senha aleatória em toda conta criada pelo link do e-mail, então `encrypted_password` não serve para isso.
- Recusa conta dona de algum tenant, com acesso em outro tenant, com convite aberto de outro tenant ou já presa a outro tenant.
- A conta que recebe o link fica **presa ao tenant** de quem gerou (`portal_conta_origem`, gravada pela função com a chave de serviço): o aceite de convite ignora convites de outros tenants para ela. Assim, abrir a conta de um e-mail alheio não dá acesso ao que outro tenant convidar depois.
- Recusas têm uma resposta só ("usar_entrada") e contam no limite de 30 pedidos por dia por tenant (com trava contra pedidos simultâneos), para não servir de sonda.
- Cada pedido vai para `event_outbox` (`portal.primeiro_acesso` ou `portal.primeiro_acesso_recusado`, sem e-mail).
- Na tela "Crie sua senha", conta com app de código vai para a tela de segurança; se o nível da sessão não puder ser lido, a tela não abre.
- O link vale uma vez e vence no prazo do Auth (configuração do Supabase).
- Limite conhecido: quem gera o link (o Yuri) poderia abrir o link antes do cliente. É o mesmo poder que ele já tem sobre o Hub; o registro em `event_outbox` deixa o rastro.
- Relecture de segurança feita por agente separado (rodada 1); correções acima incorporadas.

## Casos de borda
- Cliente antigo (entrava pelo link mágico, sem senha): usa "Primeiro acesso ou esqueceu a senha?" ou recebe o link do Yuri.
- Aceite da proposta (CX-4) leva a `/entrar?email=…`: a pessoa ainda não tem senha e usa "Primeiro acesso…".
- Link vencido ou já usado: tela "O link já foi usado ou venceu. Peça outro na tela de entrada."
- E-mail convidado que é cliente de outra empresa: recusado ("Esse e-mail já é usado em outra conta…").

## Critérios de aceite
- [ ] Cliente com senha entra em `/entrar` com e-mail e senha e cai no portal.
- [ ] Senha errada mostra o erro na tela, sem toast.
- [ ] "Primeiro acesso ou esqueceu a senha?" manda o e-mail; o link abre "Crie sua senha"; ao salvar, abre o portal.
- [ ] No Hub, enviar um convite gera o link e abre o painel com a mensagem; o link abre "Crie sua senha" sem pedir e-mail.
- [ ] Gerar link para quem já criou senha, para conta de outro tenant, para e-mail com convite de outro tenant ou sem convite é recusado; conta presa ao tenant não aceita convite de outro (teste `seg2_entrada_com_senha.test.sql`).
- [ ] Nada de chave de serviço, token ou e-mail em log ou no navegador além do token do link.

## Métrica de sucesso
Convites aceitos em até 48 horas e pedidos de "não consigo entrar" no WhatsApp: acompanhar no primeiro mês.

## Arquivos
`supabase/migrations/20261102100000_seg2_entrada_com_senha.sql`, `supabase/tests/seg2_entrada_com_senha.test.sql`, `supabase/functions/portal-acesso/`, `.github/workflows/banco-producao.yml`, `src/routes/entrar.tsx`, `src/routes/entrar_.senha.tsx`, `src/routes/auth/callback.tsx`, `src/lib/seguranca.ts`, `src/lib/acessoPortal.ts`, `src/lib/mensagens.ts`, `src/components/clientes/ClienteAcessoPortal.tsx`, `src/test/seg-2.test.ts`.
