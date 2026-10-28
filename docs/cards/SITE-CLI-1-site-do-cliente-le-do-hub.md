# Card SITE-CLI-1 · Site do cliente lê o banco do Hub

> **Origem:** PRD `PC-0` (decisão A + C do Yuri, 27/10): todo site novo de cliente nasce lendo o banco do Hub; os que já estão no ar migram um por vez, começando pelo primeiro cliente do teste.
> **Decisões:** mesmo modelo do CMS-3 (site da Fora do Papel): busca no servidor, cache curto, reserva estática. As seções vêm do pacote `src/secoes` do Hub (PC-4), para o que o cliente vê no editor ser o que vai ao ar.
> **Depende de:** PC-1 a PC-6 aplicados no banco de produção; o site ligado ao cliente na ficha do Hub, com módulos e páginas publicadas uma vez pelo Yuri.
> **Onde:** card espelho no repositório do site de cada cliente (`[REPOSITÓRIO DO SITE]`). Este arquivo é o modelo; o primeiro é `[PRIMEIRO CLIENTE DO TESTE]`.

**Objetivo:** o que o cliente publica no painel (páginas, artigos, dados do negócio e Google) aparece no site dele em até 5 minutos, sem deploy; o formulário e o botão de WhatsApp do site chegam na caixa de Contatos do painel.

**Não entra:**
- Loja (produtos, vendas, cupons): depende do card da loja.
- Portfólio: card próprio quando o primeiro cliente de portfólio entrar.
- Gerar site estático a cada publicação (evolução futura registrada no PC-0).
- Medição de visitas (Desempenho): depende da escolha da ferramenta.

## Requisitos
### P0
1. **Configuração:** URL do Supabase do Hub e chave publishable em `src/lib/config.ts` (pública por definição). Nenhuma outra chave no site.
2. **Seções:** copiar `src/secoes` do Hub (commit fixo, anotado no topo da pasta) e renderizar com o `Render` do `@puckeditor/core` na mesma versão do Hub (0.23.0). Um script `scripts/atualizar-secoes` copia de novo quando o Hub mudar. O site usa React 19, que bloqueia links `javascript:`; os componentes também passam o link por `linkSeguro`.
3. **Páginas:** cada rota de página busca no servidor `site_publico_pagina(dominio, caminho)`. Sem página publicada para o caminho, usa a página estática atual do site (reserva). Falha ou demora acima de 2 s também usa a reserva; o visitante nunca vê erro.
4. **Dados do negócio:** `site_publico_negocio(dominio)` alimenta, num lugar só, o rodapé (nome, endereço, Instagram, horário), todos os botões de WhatsApp e o título e a descrição da página inicial no Google (`<title>` e `<meta name="description">`). Sem dado no banco, usa o valor estático atual.
5. **Artigos** (só se o site tiver o módulo `artigos`): listagem e artigo por `site_publico_artigos` e `site_publico_artigo`, como no CMS-3, com a mesma reserva.
6. **Contatos** (só com o módulo `contatos`):
   - o formulário chama `site_contato_registrar(dominio, {origem: "formulario", nome, telefone, email, pagina, mensagem})`;
   - o botão de WhatsApp registra o clique com `{origem: "whatsapp", pagina}` sem atrasar a abertura do WhatsApp; se o registro falhar, o WhatsApp abre do mesmo jeito;
   - mensagens de erro em português: dados incompletos, telefone inválido, "muitas tentativas, tente em alguns minutos";
   - se o envio falhar, o texto digitado continua no formulário e o botão oferece "Tentar de novo".
7. **Cache:** respostas do servidor com cache de até 5 minutos.
8. **Mapa do site:** `/sitemap.xml` com as páginas publicadas e os artigos, com reserva no arquivo estático.

### P1
- Desafio anti-robô (Cloudflare Turnstile) no formulário, conferido no servidor antes de chamar a RPC (anotado na revisão de segurança de 28/10).
- Publicar `src/secoes` como pacote privado em vez de copiar a pasta.

### P2
- Gerar a página estática a cada publicação (evento `site.pagina_publicada` no n8n).

## Casos de borda
- Página publicada com seção que o site não conhece (versão nova do pacote no Hub): a seção não aparece e o resto da página renderiza; aviso no log do servidor.
- Domínio com e sem `www`: o banco trata igual; o site sempre chama com o domínio canônico.
- Banco fora do ar: reserva estática em tudo; o formulário mostra "Não conseguimos enviar agora. Fale pelo WhatsApp" com o número estático.
- Texto no limite (2.000 caracteres) não quebra o layout em 360, 768 e 1280 px.
- Foto sem descrição: `alt` vazio só em foto decorativa; nas seções usa o título da seção.

## Critérios de aceite
- [ ] Dado o responsável no painel, quando troca a foto da capa e publica, então o site mostra a foto nova em até 5 minutos, sem deploy.
- [ ] Dado o horário de sábado alterado em Ajustes, então o rodapé de todas as páginas mostra o horário novo em até 5 minutos.
- [ ] Dado um envio do formulário do site, então o contato aparece em Contatos no painel do cliente e conta no Início.
- [ ] O clique no WhatsApp abre o WhatsApp mesmo com o banco fora do ar.
- [ ] Com o banco fora do ar (URL errada no teste), todas as páginas abrem com o conteúdo estático.
- [ ] Nenhuma chave além da publishable no código do site (busca no repositório).
- [ ] Conferir que o `cf-connecting-ip` que chega ao banco vem do Cloudflare e não do visitante: enviar com o cabeçalho forjado e ver o IP gravado em `site_cliente_contatos` (revisão de segurança, 28/10).
- [ ] Lighthouse mobile ≥ 90 na página inicial e numa página interna (meta do CMS-0).
- [ ] Testes: rota com página do banco, com falha (reserva) e com página não publicada; formulário com sucesso, recusa e falha de rede. `bun run test`, `bun run lint`, `bun run build` passam.

## Métrica
- Rápida: tempo entre publicar no painel e aparecer no site (meta: até 5 minutos).
- Depois: pedidos de ajuste simples por WhatsApp desse cliente nos 60 dias seguintes (meta do PC-0: cair pela metade).

## Perguntas abertas
| Pergunta | Quem responde | Bloqueia? |
| --- | --- | --- |
| Qual é o primeiro cliente do teste e o repositório do site dele? | Yuri | Sim |
| O site desse cliente já usa React 19 / TanStack Start, como o da Fora do Papel? Se não, o card ganha um passo de migração. | Yuri (ou leitura do repositório) | Sim |
| Quais páginas do site atual viram páginas editáveis no primeiro momento (sugestão: só a inicial)? | Yuri | Não |

## Para o Yuri depois de publicar
- No Hub, na ficha do cliente: ligar o site, marcar os módulos, criar a página inicial com as seções do site atual, definir as seções liberadas e publicar uma vez.
- Preencher (ou pedir ao responsável) os dados do negócio em Ajustes.
- Fazer um envio de teste pelo formulário e responder pelo painel no celular.
