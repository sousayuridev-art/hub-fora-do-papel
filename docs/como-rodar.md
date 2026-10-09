# Como rodar o Hub no seu computador

Precisa de: Node 20+, Bun (`npm i -g bun`), Docker Desktop aberto e Supabase CLI (`npm i -g supabase`).

```bash
bun install
cp .env.example .env.local      # preencha com os valores do passo abaixo
supabase start                  # sobe o banco local; mostra API_URL e ANON_KEY
supabase db reset               # aplica as migrações do zero
supabase test db                # teste de isolamento: 9 de 9
bun run dev                     # abre em http://localhost:8080
```

- No `.env.local`: `VITE_SUPABASE_URL` = API_URL e `VITE_SUPABASE_ANON_KEY` = ANON_KEY (mostrados pelo `supabase start`).
- Os e-mails de acesso (link mágico) do banco local chegam em http://127.0.0.1:54324 (Mailpit), não na sua caixa de entrada.
- Para virar dono: entre uma vez com seu e-mail e rode no SQL do Studio (http://127.0.0.1:54323):

```sql
insert into public.tenants (name, slug) values ('Fora do Papel', 'fora-do-papel');
insert into public.memberships (tenant_id, user_id, role)
select t.id, u.id, 'owner' from public.tenants t, auth.users u
where t.slug = 'fora-do-papel' and u.email = 'SEU-EMAIL';
```

## Rotas da Sprint 0

| Endereço | Quem entra |
|---|---|
| `/entrar` | todos (login por link mágico) |
| `/app/*` | dono do tenant (menu do operador) |
| `/portal/*` | cliente (portal; no celular, abas embaixo) |
| `/sem-acesso` | quem entrou mas ainda não tem papel |

`/app/configuracoes` tem o teste de conexão (aviso de sucesso e de erro com "Tentar de novo").
