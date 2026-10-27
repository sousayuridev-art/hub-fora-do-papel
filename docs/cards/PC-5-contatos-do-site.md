# Card PC-5 · Contatos do site no painel

> **Origem:** PRD `PC-0` (27/10). Relacionado: SITE-2b (formulário e WhatsApp do site).
> **Decisões:** formulário e cliques no WhatsApp numa caixa só, chamada "Contatos" (glossário).

**Objetivo:** quem procura o cliente pelo site aparece no painel, e o cliente responde pelo WhatsApp com uma mensagem pronta e marca como respondido.

**Não entra:**
- Aviso por e-mail ou WhatsApp de contato novo (P1 do PC-0, via `event_outbox` e n8n).
- Ligação com o Funil de vendas do Hub (os contatos são do cliente, não da Fora do Papel).

## Requisitos
### Banco (`supabase/migrations/[data]_pc5_contatos.sql`)
- `site_contatos` (id, site_id, tenant_id, nome, telefone, email null, origem enum `formulario`/`whatsapp`, pagina, mensagem, respondido bool, respondido_em, respondido_por, criado_em).
- RPC pública `site_contato_registrar(p_dominio, p_dados)` executável por `anon`: valida domínio, tamanho dos campos e telefone; limite de envios por IP e domínio; sem leitura pública.
- RPCs do painel: `portal_contatos(p_site, p_filtro)` (lista virtualizável) e `portal_contato_respondido(p_id)`; ambas com `pode_editar_site`.
- Contador "contatos sem resposta" entra no `portal_inicio()` (PC-1) e no selo do menu.
- Evento `contato.recebido`.

### Telas
- **Contatos** (`/portal/clientes/contatos`): abas "Esperando resposta" e "Todos", com contador. Cada linha: nome, ícone da origem, trecho da mensagem, quando e de qual página.
- Detalhe em painel lateral: mensagem, situação, "Responder no WhatsApp" (principal; abre `wa.me` com "Oi, [nome]! Aqui é do [empresa]. Vi sua mensagem pelo site.", que a pessoa revisa antes de enviar) e "Já respondi".
- Lista vazia: "Nenhum contato esperando. Quando chegar um novo, ele aparece aqui."
- Site: formulário e botão de WhatsApp chamam `site_contato_registrar` (no site, card próprio do repositório do site).

## Critérios de aceite
- Dado um envio do formulário no site da Clínica, então o contato aparece no painel da Clínica e no contador do Início, e não aparece para outra empresa (teste de banco).
- "Já respondi" tira da aba "Esperando resposta" na hora; se o banco recusar, volta e avisa.
- `anon` não lê `site_contatos` (teste de banco); só registra pela RPC.
- Envio repetido acima do limite é recusado sem gravar.
- pgTAP `supabase/tests/pc5_contatos.test.sql` passa; `bun run build`, `bun run lint`, `bun run test` passam.

## Para o Yuri depois de publicar
- Enviar um contato de teste pelo site e responder pelo painel no celular.
