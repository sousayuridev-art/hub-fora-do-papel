# Card CMS-4 · Páginas editáveis por campos fixos (27/10)

> PRD: `CMS-0`. Depende de CMS-1 a CMS-3.

## Requisitos
1. Chaves de `site_blocos` e seus campos, com limite de caracteres:
   - `inicio.topo`: linha acima (40), título (90), apoio (300), chamada (fixa, não editável), link para sites (80).
   - `inicio.frentes`: 4 frentes, cada uma com situação (90), título (40), frase (160), tópicos (até 6, 90 cada).
   - `perguntas`: lista de pergunta (120) e resposta (600).
   - `projetos`: projetos reais com nome, linha (120), imagem do bucket, link.
   - `quem-somos`: título (60) e texto (300).
2. Hub: aba "Páginas" em Conteúdo do site, um formulário por chave, contador de caracteres, prévia e "Publicar".
3. Site: cada seção lê a chave publicada, com reserva no texto atual do código.

## Critérios de aceite
- [ ] Mudar o título do topo no Hub e ver no site em até 5 minutos.
- [ ] Texto no limite máximo não quebra o layout em 360, 768 e 1280 px.
- [ ] Testes, lint e build passam nos dois repositórios.
