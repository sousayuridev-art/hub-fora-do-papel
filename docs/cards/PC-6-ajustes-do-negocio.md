# Card PC-6 · Ajustes do negócio no painel

> **Origem:** PRD `PC-0` (27/10).
> **Decisões:** dados que aparecem em várias páginas do site (WhatsApp, endereço, horário, redes, título no Google) ficam num lugar só e o site lê de lá.

**Objetivo:** o cliente muda o horário de atendimento, o WhatsApp ou como o site aparece no Google uma vez, e o site inteiro se atualiza.

**Não entra:**
- Convite da equipe pelo responsável (P1 do PC-0; hoje o Yuri convida pelo Hub, CX-0).
- Baixar dados e cópia do site (P1 do PC-0).
- Domínio e e-mail (continuam com a Fora do Papel).

## Requisitos
### Banco (`supabase/migrations/[data]_pc6_dados_do_negocio.sql`)
- `sites` ganha `negocio jsonb` com `{ "nome", "whatsapp", "endereco", "instagram", "horario": [{ "dias": "Segunda a sexta", "abre": "09:00", "fecha": "18:00", "fechado": false }] }` e `google jsonb` com `{ "titulo" (≤ 60), "descricao" (≤ 155) }`.
- RPCs `site_negocio_salvar(p_site, p_dados)` e `site_google_salvar(p_site, p_dados)` com `pode_editar_site` e validação (telefone, horário válido, limites). Publicam na hora (sem rascunho) e gravam evento `site.negocio_atualizado`.
- Leitura pública: `site_publico_negocio(p_dominio)`.

### Telas
- **Ajustes** (`/portal/ajustes`), abas:
  - **Seu negócio:** nome, WhatsApp ("usado em todos os botões de WhatsApp do site"), endereço, Instagram e horário de atendimento por dia, com "Fechado".
  - **Aparecer no Google:** título e descrição com contador e a prévia "Como aparece no Google"; frase "O Google atualiza no tempo dele, normalmente em alguns dias. Não é possível garantir posição."
  - **Equipe:** lista de quem tem acesso e o perfil (somente leitura nesta entrega; "Para incluir alguém, peça à Fora do Papel").
  - **Seu site:** domínio e saúde do site.
- Ação rápida "Mudar horário de atendimento" do Início abre direto a aba Seu negócio.
- Aviso de sucesso: "Alterações salvas e publicadas no site".

## Critérios de aceite
- Pessoa de outra empresa não lê nem grava os dados do negócio (teste de banco). Gravação pelo cliente passa por `_site_editavel` (PC-3).
- Dado o responsável, quando muda o sábado para 9h às 14h e salva, então `site_publico_negocio` devolve o horário novo e o rodapé do site mostra em até 5 minutos.
- Título com 61 caracteres é recusado pelo banco e a tela mostra o limite antes de salvar.
- Equipe também salva (não é dinheiro); outra empresa não (teste de banco).
- Erro de rede mantém o que foi digitado e oferece "Tentar de novo".
- pgTAP `supabase/tests/pc6_dados_do_negocio.test.sql` passa; `bun run build`, `bun run lint`, `bun run test` passam.

## Para o Yuri depois de publicar
- Preencher os dados do negócio dos clientes atuais (ou pedir que o responsável preencha no primeiro acesso, pelo checklist do Início).
