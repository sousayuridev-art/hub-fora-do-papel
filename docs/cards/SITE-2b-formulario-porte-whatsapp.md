# SITE-2b · Formulário: WhatsApp no agendamento e tamanho da empresa

Pedido do Yuri em 15/10/2026, junto com o SITE-2a. Vale para dois repositórios:
- **hub-fora-do-papel:** migração nova que ajusta a RPC `site_registrar_contato` (a migração do SITE-1 continua como está).
- **site:** campos novos no formulário de `contact.tsx` e em `src/lib/api.ts`.

Os dois vão ao ar juntos com o SITE-2a. A migração do SITE-1 ainda não foi aplicada em produção: aplicar as duas na mesma janela, com aprovação do Yuri.

## Visão de negócio
O agendamento confirma o horário pelo WhatsApp, mas hoje o número é opcional: um pedido sem WhatsApp não tem como ser confirmado. E o tamanho da empresa ajuda o Yuri a preparar a conversa sem filtrar ninguém (o campo é opcional).

## Requisitos

### Banco (repo do Hub)
- Migração `supabase/migrations/<data>_site_contatos_porte.sql`:
  - coluna `porte text null` em `site_contatos`, com `check (porte in ('ate_10','11_50','51_200','mais_200'))`;
  - `drop function` da assinatura antiga e `create function site_registrar_contato(...)` com o novo parâmetro `p_porte text default null` (mesma ordem dos demais, no fim); `grant execute` para `anon` de novo;
  - quando `p_tipo = 'horario'`, WhatsApp obrigatório (só dígitos, 10 a 13 após limpar) → erro `whatsapp_invalido`;
  - `porte` gravado e incluído no evento `site.contato_recebido` (sem outros dados pessoais no evento além do que já existe).
- Testes em `supabase/tests/site_contatos.test.sql`: horário sem WhatsApp é recusado; porte inválido é recusado; porte válido é gravado; todos os testes antigos continuam passando.

### Site
- `contact.tsx`: no "Marcar horário", WhatsApp obrigatório com `inputMode="tel"` e `autoComplete="tel"`; e-mail continua obrigatório ("Para enviar o resumo da conversa"); campo opcional "Quantas pessoas trabalham aí?" (Prefiro não dizer · Até 10 · 11 a 50 · 51 a 200 · Mais de 200).
- `src/lib/api.ts`: envia `p_porte` (ou `null` para "Prefiro não dizer"); trata `whatsapp_invalido` com mensagem clara no campo.
- Assunto vindo do "Quero algo assim" (SITE-2a) vai em `p_assunto`.

## Casos de borda
- Número com máscara, espaços ou `+55`: limpo antes de validar.
- Visitante na aba "Mandar mensagem": WhatsApp continua opcional.
- Site novo com banco antigo (ordem de publicação errada): a chamada falha com erro visível; por isso banco primeiro, site depois.

## Critérios de aceite
- [ ] `supabase test db` passando, com os testes novos
- [ ] Pedido de horário sem WhatsApp recusado no banco e no formulário
- [ ] Contato de teste com porte aparece em `site_contatos.porte` e no evento
- [ ] `bun run test` e `bun run build` sem erro no site
