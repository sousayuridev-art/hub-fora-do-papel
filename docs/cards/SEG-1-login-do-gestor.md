# Card SEG-1 · Login do gestor com senha e código do app

> **Decisão (Yuri, 22/10):** o gestor entra com e-mail, senha e código de 6 dígitos de um app autenticador (Google Authenticator, Microsoft Authenticator, 1Password…). O link por e-mail fica só para recuperar o acesso. Clientes do portal continuam entrando por link.

## Visão de negócio
O Hub guarda clientes, contratos, dinheiro e transcrições de reuniões. Entrar só com um link no e-mail deixa tudo nas mãos de quem tiver acesso ao e-mail. Com senha e código do app, quem rouba a senha ou o e-mail ainda não entra. Métrica: 100% dos acessos de gestor com código verificado.

## Escopo
1. **Tela de entrada** com duas opções: "Sou cliente" (link no e-mail, como hoje) e "Sou da equipe Fora do Papel" (e-mail e senha). Quem chega indo para `/app` vê a da equipe; quem chega indo para o portal vê a do cliente.
2. **Código do app (segunda etapa):** depois da senha, a tela pede o código de 6 dígitos (`inputMode="numeric"`, `autoComplete="one-time-code"`).
3. **Página Segurança** (`/seguranca`, só para gestor logado):
   - Criar ou trocar a senha: mínimo de 12 caracteres, com confirmação, e medidor simples.
   - Ativar o app autenticador: QR code, chave para digitar à mão e confirmação com um código. Mostra os apps ligados e permite incluir um segundo aparelho (reserva) ou tirar um.
4. **Obrigatório para gestor:** sem app autenticador ativado, o gestor é levado à página Segurança antes de usar o Hub. Com app ativado, toda sessão precisa do código (inclusive a que veio por link).
5. **"Esqueci a senha":** envia o link por e-mail. O link leva ao código do app e depois a "Criar nova senha". Só o link não abre o Hub.
6. **No banco:** as verificações de dono (`is_tenant_owner` e `_tenant_do_dono`) passam a exigir sessão com código verificado (`aal2`) quando a pessoa tem app autenticador ativado. Assim, uma sessão só com senha ou só com link não lê nem grava nada de gestor, mesmo chamando o banco direto.
7. **Configurações:** seção "Segurança da conta" com a situação (senha e app) e o link para a página.

## Não entra
- Login social (Google), chaves de acesso (passkeys) e SMS.
- Códigos de recuperação impressos (o Supabase ainda não oferece): a reserva é um segundo aparelho no app autenticador.

## Configuração no Supabase (painel, feita junto)
- Autenticação › Provedores › E-mail: login com senha ligado.
- Autenticação › Multi-Factor: app autenticador (TOTP) ligado para cadastro e verificação.
- Autenticação › Senhas: mínimo de 12 caracteres, com letras e números.

## Casos de borda
- Perdeu o celular sem segundo aparelho: o Yuri remove o fator pelo painel do Supabase (Authentication › Users) e ativa de novo. Registrado no card como procedimento.
- Senha errada várias vezes: o Supabase limita as tentativas; a tela mostra "Muitas tentativas. Espere alguns minutos."
- Código errado: "Código não confere. Confira a hora do celular e tente de novo."
- Pessoa do portal na tela da equipe: entra só com senha se tiver, mas cai no portal (o papel decide), e nada muda para ela.
- Sessão antiga, de antes do código: na primeira navegação o Hub pede o código.

## Critérios de aceite
- [ ] Entrar com e-mail, senha e código e cair no Painel.
- [ ] Sem código, nenhuma tela de `/app` abre e o banco recusa as RPCs de dono (teste de banco com `aal1` e fator ativo).
- [ ] Link por e-mail sozinho não abre o Hub para quem tem app ativado.
- [ ] Ativar o app pelo QR e entrar de novo pedindo o código.
- [ ] Portal do cliente continua entrando por link, sem pedir código.
- [ ] Build, lint, testes e testes de banco passam; revisão de segurança separada.
