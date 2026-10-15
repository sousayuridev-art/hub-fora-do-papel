# Como atualizar o banco de produção

O banco de produção é o Supabase `cjzzbpqwlpjvlawllfqy`. Ele só muda por migração (`supabase/migrations`), nunca pelo painel.

## Uma vez só: cadastrar os segredos no GitHub
GitHub → repositório `hub-fora-do-papel` → **Settings → Secrets and variables → Actions → New repository secret**:

| Nome | Onde pegar |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | supabase.com → avatar → **Account preferences → Access Tokens → Generate new token** |
| `SUPABASE_DB_PASSWORD` | A senha do banco do projeto (definida ao criar o projeto; se esqueceu: **Project Settings → Database → Reset database password**) |

Os valores ficam guardados no GitHub e não aparecem em lugar nenhum, nem nos registros.

## Toda vez que houver migração nova
1. A migração foi testada localmente (`supabase db reset` e `supabase test db`) e está no GitHub.
2. GitHub → **Actions → Banco de produção · migrações → Run workflow**, modo **verificar**.
3. Abra a execução e leia o passo **Simular**: ele lista as migrações que serão aplicadas. Confira se são só as esperadas.
4. Rode de novo com modo **aplicar**.
5. No passo **Situação depois de aplicar**, as colunas Local e Remote devem ter as mesmas migrações.

## Se der erro
- "Falta o secret": cadastre o segredo indicado (passo acima).
- Erro de senha: troque o `SUPABASE_DB_PASSWORD` pela senha atual.
- Erro dentro de uma migração: nada é gravado pela metade naquela migração. Corrija no repositório, teste localmente e rode de novo.
