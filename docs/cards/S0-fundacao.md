# Card S0 · Fundação do Hub

> **Status (09/10):** passos 1 a 4 feitos pelo Claude Code e testados. O Lovable exigiu a base TanStack Start: as rotas são por arquivo em `src/routes` (TanStack Router), a proteção das áreas fica no `beforeLoad` e o gerenciador é o `bun`. Falta só o passo 5 (Supabase remoto), que depende de você. Como rodar: `docs/como-rodar.md`.

**Objetivo:** deixar o projeto pronto para receber os módulos: repositório sincronizado com o Lovable, banco com segurança por tenant testada, login por link, as duas áreas (operador e portal) com seus menus e o padrão de dados, avisos e erros.
**Estimativa:** 1 dia (6 a 8 horas).
**Depende de:** layout aprovado (ok, 09/10). PRD seções 6, 20 e 21.
**Não entra aqui:** telas de verdade dos módulos (Pipeline, Projetos etc.). Aqui elas são só páginas vazias com título.

---

## Antes de começar (uma vez só)

- Contas: GitHub, Lovable, Supabase (projeto novo, região São Paulo).
- No computador: Node 20 ou mais novo, Git, Docker Desktop (o Supabase local roda nele), Supabase CLI (`npm i -g supabase`) e Claude Code (`npm i -g @anthropic-ai/claude-code`; entre com a sua conta do Claude, sem `ANTHROPIC_API_KEY` configurada, senão cobra pela API). Para ver o código, pode usar o VS Code com a extensão do Claude Code.
- O `CLAUDE.md` deste pacote fica na raiz do projeto. O Claude Code lê esse arquivo sozinho em todo pedido.

---

## Passo 1 · Criar o projeto no Lovable e ligar ao GitHub (1 crédito)

O Lovable não importa repositório criado fora dele: o projeto nasce lá e ele cria o repositório no GitHub. Por isso o primeiro passo é no Lovable, com uma mensagem só:

> Crie um projeto vazio chamado "hub-fora-do-papel" em Vite + React + TypeScript + Tailwind + shadcn/ui. Não crie telas, banco nem autenticação e não ative o Lovable Cloud; só a estrutura inicial com uma página "Hub Fora do Papel".

Depois: Lovable > GitHub > conectar e criar o repositório. No computador: `git clone` do repositório, descompacte este pacote na raiz e rode `claude` dentro da pasta. A partir daqui, tudo é feito no Claude Code e enviado com `git push`. Não edite nada no Lovable: ele grava direto no GitHub e cria conflito com o seu código.

## Passo 2 · Dependências (terminal)

```bash
npm i @supabase/supabase-js @tanstack/react-query @tanstack/react-virtual react-router-dom sonner zod
npm i -D @tanstack/react-query-devtools
```

## Passo 3 · Banco local e segurança

1. Copie para o repositório os dois arquivos que vieram junto com este card:
   - `supabase/migrations/20261010000000_base.sql`
   - `supabase/tests/rls_base.test.sql`
2. Terminal:
```bash
supabase init          # se a pasta supabase/ ainda não tiver config.toml
supabase start         # sobe o Supabase local no Docker
supabase db reset      # aplica a migração do zero
supabase test db       # roda o teste de isolamento: 9 de 9 devem passar
```
3. Crie o tenant e o seu acesso de dono (só uma vez, pelo SQL Editor do Supabase local e depois do remoto):
```sql
insert into public.tenants (name, slug) values ('Fora do Papel', 'fora-do-papel');
-- depois de entrar uma vez pelo link mágico com o seu e-mail:
insert into public.memberships (tenant_id, user_id, role)
select t.id, u.id, 'owner' from public.tenants t, auth.users u
where t.slug = 'fora-do-papel' and u.email = 'SEU-EMAIL';
```

A migração já foi testada num Postgres limpo: aplica sem erro e os 9 testes de isolamento passam.

## Passo 4 · Estrutura do app (Claude Code)

No Claude Code, comece com `/model sonnet` (código de estrutura não precisa do Opus) e cole o pedido abaixo, citando os arquivos com @:

> Siga o @CLAUDE.md e leia @supabase/migrations/20261010000000_base.sql. Monte a estrutura base do Hub, sem telas de módulo:
> 1. `src/lib/supabase.ts` com o client (variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, e `.env.example`).
> 2. `src/lib/queryClient.ts` com TanStack Query (staleTime 30s, retry 1 em queries e 0 em mutações) e o provider no `main.tsx`, com devtools só em desenvolvimento.
> 3. `src/lib/notify.ts`: wrapper do Sonner com `ok(msg, {desfazer?})` e `erro(msg, {tentarDeNovo?})`. Toda mutação usa esse wrapper (PRD seção 21).
> 4. Autenticação por link mágico: página `/entrar` (só e-mail), `/auth/callback`, hook `useSession` e `useAccess` que chama a RPC `my_access()` e devolve papel `owner` ou `client`.
> 5. Rotas com react-router: `/app/*` só para `owner`, `/portal/*` só para `client`; quem não tem acesso vai para `/entrar`; quem entra sem papel vê "Seu acesso ainda não foi liberado".
> 6. `OperatorLayout` com o menu lateral agrupado exatamente assim: Painel · VENDER (Pipeline, Clientes, Propostas, Tráfego pago) · ENTREGAR (Projetos, Pedidos) · GESTÃO (Financeiro, Relatórios) · rodapé com Configurações e o usuário. No celular, o menu vira gaveta com botão no topo.
> 7. `PortalLayout` com cabeçalho e menu superior: Início, Aprovações, Pedidos, Pagamentos, Arquivos. No celular (até 767 px), siga a seção "Estrutura" de @docs/cards/P-portal-celular.md: `PortalHeader` de 56 px, `PortalTabs` embaixo e o componente `ActionBar` (ainda sem uso). Os selos ficam fixos em 0 até existir a RPC de contagem.
> 8. Uma página vazia por item de menu, com o título e o texto "Em construção".
> 9. Error boundary global com tela amigável e botão "Tentar de novo".
> Componentes pequenos, um por arquivo, TypeScript estrito. Não crie tabelas novas.

## Passo 5 · Supabase remoto e publicação

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push       # sobe a mesma migração para o projeto remoto
```
No Supabase remoto: Authentication > URL configuration, adicione a URL do Lovable e `http://localhost:5173` como endereços de retorno do link mágico. Coloque `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas variáveis do Lovable. Faça `git push`; o Lovable recebe o código e você publica por lá.

---

## Critérios de aceite

- [ ] `supabase test db` passa 9 de 9.
- [ ] Você entra pelo link mágico e cai em `/app`, com o menu agrupado como no protótipo.
- [ ] Um e-mail cadastrado como cliente entra e cai em `/portal`; tentar abrir `/app` volta para o portal.
- [ ] Um e-mail sem papel vê "Seu acesso ainda não foi liberado".
- [ ] No celular (390 px), o menu do operador vira gaveta; no portal, o cabeçalho tem 56 px e as 5 abas ficam embaixo, sem cobrir conteúdo.
- [ ] Uma mutação de teste com erro mostra o aviso de erro com "Tentar de novo"; com sucesso, o aviso de sucesso.
- [ ] O mesmo código roda local (`npm run dev`) e publicado no Lovable.

## Próximo card

S1 · Clientes e Pipeline (RF-01 a RF-05, painel "Novo lead" e "Novo cliente" da seção 20).
