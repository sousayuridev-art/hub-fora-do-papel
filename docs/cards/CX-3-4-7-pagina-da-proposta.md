# CX-3, CX-4 e CX-7 · Proposta em página de leitura, depois do aceite e serviço adicional

Aprovado em 20/10/2026 ("Durante: a página do link", canvas telas 4 a 7; direção A).

## CX-3 · Proposta
- Capa escura (`.capa-escura`: #0E1013, brilho azul-marinho, grade fina) com a promessa em Bricolage, "Proposta para [nome]", apresentação e os fatos em uma linha: vale até (ou aceita em), lançamento previsto, responsável.
- Cartão de investimento em papel claro sobre a capa: valor, partes, mensalidade, "Ver o investimento".
- O conteúdo sobe numa folha clara com cantos arredondados por cima da capa.
- Topo fixo escuro e sólido, sem desfoque (M15).
- Índice com progresso: no computador fica fixo e marca a seção atual em âmbar; no celular vira faixa de atalhos.
- Barra do celular: valor + "Ir para o aceite" (leva ao bloco; nunca aceita direto).
- Títulos das seções em Bricolage; sem rótulos em caixa alta.

## CX-4 · Depois do aceite
- O aceite deixa o portal pronto: convite de **responsável pelo contrato** para o e-mail do aceite (se ainda não tem acesso nem convite aberto; dono da agência não vira cliente). Migração `20261020200000_cx4_aceite_abre_portal.sql`.
- A proposta aceita devolve esse e-mail; "Abrir meu portal" leva a `/entrar?email=…&volta=/portal` com o e-mail preenchido.
- Tela "Combinado, [nome]. Vamos começar.": três próximos passos (aceite registrado, primeira parte combinada com o responsável, acompanhar pelo portal), comprovante e "Imprimir ou salvar em PDF".

## CX-7 · Serviço adicional
- Mesmo molde: título em Bricolage e caixa de decisão escura com o valor grande, aprovar ou "Agora não" com confirmação.

## Critérios de aceite
- [x] `s2_propostas.test.sql`: aceite cria o convite de responsável, sem duplicar, e devolve o e-mail.
- [x] Conferido no navegador com dados de exemplo: capa, índice, investimento e aceite no computador e no celular.
- [x] `bun run build`, `bun run lint`, `bun run test`.
