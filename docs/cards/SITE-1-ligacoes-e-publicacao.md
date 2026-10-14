# SITE-1 · Site: ligações reais, blog, privacidade e publicação

Pedido do Yuri em 14/10/2026. Frente 1 do plano de lançamento. Vale para dois repositórios:
- **site** (projeto Lovable 1cc8ff9f…, a ligar ao GitHub): tudo que é tela, conteúdo e SEO.
- **hub-fora-do-papel**: só a migração que recebe os contatos (o banco é o Supabase do Hub).

Decisões já tomadas: contatos vão para o Supabase do Hub (D4); domínio `foradopapel.com.br` no Registro.br (D5); CNPJ 48.462.342/0001-50; WhatsApp +55 79 99834-1395 (D11).

## Visão de negócio
Hoje o formulário, a agenda e a inscrição mostram sucesso sem enviar nada: todo contato se perde. Este card faz cada contato chegar de verdade, dá ao site conteúdo indexável e o deixa pronto para os anúncios (portão 2).

## Requisitos

### 1. Recebimento de contatos (repo do Hub)
- Tabela `site_contatos` com `tenant_id`, `tipo` (`mensagem` | `horario` | `inscricao`), nome, e-mail, WhatsApp, assunto, mensagem, `horario_sugerido timestamptz`, `consentimento_em timestamptz`, origem (UTM e página), `created_at`. RLS ativa; só o dono do tenant lê.
- RPC `site_registrar_contato` (`security definer`, liberada para `anon`): valida campos e tamanhos, exige consentimento, fixa o tenant `fora-do-papel`, limita repetição (mesmo e-mail e tipo em menos de 1 min), grava o contato e o evento `site.contato_recebido` em `event_outbox` na mesma transação.
- Teste em `supabase/tests`: anônimo não lê a tabela; RPC grava contato e evento; dado inválido é recusado.

### 2. Formulário, horário e inscrição (site)
- `src/lib/api.ts` chama a RPC; nada de `setTimeout` simulando envio. Sucesso só com resposta do banco; erro mostra aviso com "Tentar de novo".
- Campo isca (honeypot) contra robôs; caixa de consentimento com link para a política.
- Agenda: horários fixos Manhã 10h e 11h30 · Tarde 15h e 17h · Noite 19h e 19h30, com o aviso "Horário sugerido: confirmamos pelo WhatsApp". O pedido grava `tipo = horario`; nada de "Horário reservado".
- Inscrição do blog grava `tipo = inscricao` e não mostra sucesso sem gravar.

### 3. Blog com 9 artigos
- 9 artigos completos e originais (temas do pedido), cada um com título, introdução, subtítulos, exemplos, conclusão com chamada, título SEO, meta descrição, URL amigável e links internos.
- Sem números, depoimentos ou casos inventados; dados que dependem do Yuri ficam como marcador e o artigo não vai ao ar com marcador visível.

### 4. Política de privacidade
- Página `/privacidade` adaptada ao site real (formulário, horário, inscrição, WhatsApp, medição, anúncios), com CNPJ 48.462.342/0001-50. Razão social, endereço, responsável e e-mail de privacidade como `[A CONFIRMAR]`. Sem afirmar conformidade integral com a LGPD.
- Link no rodapé e junto de cada coleta de dados.

### 5. Botão de WhatsApp
- Flutuante em todas as páginas, `https://wa.me/5579998341395?text=` com a mensagem inicial do pedido; 56 px, `aria-label`, não cobre formulários nem a barra do celular; abre em nova aba.

### 6. SEO técnico
- `sitemap.xml` gerado com páginas públicas e os 9 artigos; `robots.txt` apontando o sitemap; canonical com `https://foradopapel.com.br`; um h1 por página; página 404; dados estruturados (`Organization`, `Article`) só com dados verdadeiros.

### 7. Medição e consentimento
- Aviso de cookies com "Recusar" tão visível quanto "Aceitar"; nada de GA4/GTM/pixel antes do aceite.
- Eventos prontos (`whatsapp_clique`, `contato_enviado`, `horario_pedido`, `inscricao_enviada`) disparados só após sucesso real, sem dados pessoais. IDs de GA4/GTM/pixel ficam em variável de ambiente vazia até o Yuri fornecer.

### 8. Desempenho
- Lighthouse mobile medido antes e depois (build local de produção). Meta ≥ 90 em desempenho, acessibilidade, boas práticas e SEO.

### 9. Domínio e publicação
- Levantar o DNS atual de `foradopapel.com.br` sem alterar nada; listar os registros que o Lovable pede, `www` → raiz e HTTPS. Mudança de DNS só com aprovação do Yuri.

## Casos de borda
- Rede caiu no envio: aviso de erro, dados do formulário mantidos.
- Mesmo contato enviado duas vezes seguidas: grava uma vez, responde sucesso.
- Visitante recusou cookies: nenhuma ferramenta de medição carrega; WhatsApp e formulário seguem funcionando.
- Supabase fora do ar: erro claro e convite para o WhatsApp.

## Critérios de aceite
- [ ] Contato de teste enviado pelo site aparece em `site_contatos` e em `event_outbox`
- [ ] Nenhuma mensagem de sucesso sem gravação (testado com a rede desligada)
- [ ] Agenda com os 6 horários e o aviso de horário sugerido
- [ ] 9 artigos com URL própria, metadados, canonical e no sitemap; nenhum marcador visível
- [ ] `/privacidade` publicada, linkada no rodapé e nos formulários
- [ ] Botão de WhatsApp abre a conversa com o texto, em todas as páginas, sem cobrir nada no celular
- [ ] `sitemap.xml` e `robots.txt` acessíveis no domínio com as URLs corretas
- [ ] Nenhuma ferramenta de medição carrega antes do aceite
- [ ] Lighthouse mobile ≥ 90 nas 4 categorias, com medição registrada
- [ ] `bun run build`, `bun run lint` e `supabase test db` passando

## Depende do Yuri
- Login no Lovable para ligar o site ao GitHub.
- GA4 recebido em 14/10: `G-MND58YQ287` (vai em `VITE_GA4_ID`, carregado só após o aceite de cookies; o trecho `gtag.js` colado direto no `<head>` não será usado). Número `16128357974` recebido: confirmar se é o ID do Google Ads (`AW-…`). Pixel da Meta: pendente.
- Razão social, endereço e e-mail de privacidade.
- Acesso ao Registro.br para conferir o DNS (só leitura).

## Situação em 14/10/2026
- Código no repositório `sousayuridev-art/fora-do-papel-blueprint` (commit 8972bd9). Testes 23/23, build ok.
- Teste ponta a ponta local: horário, mensagem e inscrição gravados em `site_contatos` e `event_outbox`; sem rede, erro e nenhum sucesso.
- Lighthouse mobile local (com compressão, como na CDN): inicial 92/100/100/92 → 96/100/100/100; artigos 96/100/100/100; artigo 95/100/96/100 (96 por imagem servida só pelo Lovable).
- Falta: aplicar esta migração no Supabase de produção, ligar o domínio no Lovable (DNS do Registro.br sem registros hoje), confirmar dados da política, ID do Google Ads e pixel.
