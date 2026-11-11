# SITE-43 · Foto do site no ar na capa do cartão

> Origem: Yuri, 11/11/2026 ("por que não aparece a imagem?" nos cartões do Junior e da Mansão). Caminho escolhido: foto automática do site no ar.

## Problema

A capa do cartão em Sites é montada com o que foi publicado pelo editor de páginas do Hub. Sites feitos fora do editor (Junior Soares, Mansão Mediterrâneo) mostram "Ainda sem página publicada", mesmo com o site no ar.

## O que muda

- Sem página do Hub para mostrar, a capa mostra uma foto do endereço do site, tirada pelo serviço público de capturas do WordPress (mShots).
  - O serviço não pede chave.
  - A foto se atualiza sozinha em até um dia.
  - Só o endereço do site sai do Hub.
- Se a foto não carregar, ou se o site não tiver um endereço válido, volta o aviso de antes.
- Sites com página no editor do Hub, e o site da Fora do Papel, não mudam.

## Critérios de aceite

- [x] O cartão sem página do Hub mostra a foto do domínio (teste).
- [x] Um domínio inválido não gera endereço de foto (teste).
- [x] Sem domínio, o aviso continua (teste).
- [x] `bun run build`, `bun run lint` e `bun run test` passam.
- [x] Conferência em Sites no Hub publicado (11/11): a Mansão mostra a foto do topo do site.

## Observação

Na primeira vez, o serviço pode devolver uma imagem de "gerando" por alguns segundos. A foto aparece quando a página é aberta de novo.
- O site do Junior (juniorsoarespersonal.lovable.app) saiu com a tela de carregamento do Lovable. A página dele só se monta no navegador, e a captura foi tirada antes disso. Ela deve melhorar quando o site for para o domínio próprio, com a página montada no servidor.
