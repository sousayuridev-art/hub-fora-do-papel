# Card REV-4 · Revisão de segurança do painel do cliente e do site do Junior (28/10)

> Revisão feita por três leitores separados (banco, telas do painel, site do cliente), depois das entregas PC-1 a PC-6 e SITE-CLI-1. Migração `20261028600000_revisao_seguranca_painel_2.sql`, testes em `supabase/tests/revisao_seguranca_painel_2.test.sql`.

## Corrigido
| # | Achado | Gravidade | Correção |
| --- | --- | --- | --- |
| 1 | Site do Junior: texto de Ajustes com `</script>` rodava código no site (dados estruturados) | Alta | Escape de `<`, `>` e `&` no JSON-LD (site do Junior e site da Fora do Papel) |
| 2 | Site muda de empresa: a nova via os contatos da anterior | Média | Contato guarda a empresa; portal, contador e RLS filtram por ela |
| 3 | Limite por endereço IP valia para todos os sites juntos; IPv6 trocava de endereço à vontade | Média | Limite por endereço dentro do site; IPv6 agrupado por /64 |
| 4 | Clique no WhatsApp com página inventada furava o limite por página | Média | Só grava página no formato do site (`/caminho#assunto`) |
| 5 | Cache do site do Junior crescia sem limite com endereços inventados | Média | Teto de 200 entradas |
| 6 | Publicar levava ao ar rascunho que a pessoa não viu | Baixa/média | `site_pagina_publicar(p_id, p_versao)` |
| 7 | `//outro.site` passava como caminho do site; foto de outro servidor com o caminho certo passava | Baixa | Regra de link e foto com o endereço deste projeto (banco e `linkSeguro`) |
| 8 | Artigos do portal: capa e links do texto sem as regras das páginas | Baixa | Mesma regra para quem não é dono (`artigo_invalido`) |
| 9 | Fotos: apagar e reenviar crescia sem teto | Baixa | Teto de 300 arquivos por site |
| 10 | Equipe via e-mail de todas as pessoas da empresa | Baixa | E-mail só para dono e responsável |
| 11 | IP dos visitantes guardado para sempre | Baixa (LGPD) | Apagado depois de 2 dias |
| 12 | Excesso respondia 500 | Baixa | Responde 429 (`PT429`) no painel e nos contatos |
| 13 | Site do Junior sem cabeçalhos de segurança; `.env` fora do `.gitignore`; dependências de build com alerta | Baixa | Cabeçalhos (moldura, nosniff, referrer, permissões), `.gitignore` e `bun audit fix` |
| 14 | Editor: sair logo após digitar podia perder a mudança sem aviso; reabrir mostrava falso conflito | Baixa | Aviso na tela e cópia da página renovada ao sair |
| 15 | Seção publicada com campo em formato inesperado derrubava a página do site | Baixa | Volta ao visual estático do site |

## Fica para depois
- Desafio anti-robô (Turnstile) quando algum site tiver formulário: o teto por site (30 a cada 10 min) ainda pode ser esgotado por quem troca muito de endereço.
- Conferir no ar se `cf-connecting-ip` não pode ser forjado (critério do SITE-CLI-1).
- Conferir no n8n que `site.contato_recebido` com `origem = whatsapp` não cria negócio no Pipedrive.
- CSP com `script-src` quando o TanStack Start tiver nonce.
- `happy-dom` (vem do Puck, só no editor; não vai para o site publicado) com alerta sem versão corrigida no intervalo.
