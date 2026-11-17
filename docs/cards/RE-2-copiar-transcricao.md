# RE-2 · Copiar a transcrição inteira

> Pedido do Yuri em 17/11/2026: na transcrição da reunião, um campo para copiar a transcrição toda.

## Problema

A lista de falas é virtualizada: só as falas visíveis existem na tela. Selecionar com o mouse pega um pedaço, nunca a reunião inteira.

## O que muda

- **Botão "Copiar transcrição"**
  - Fica acima da lista e copia tudo, uma fala por linha: `[12:05] Nome: fala`.
  - Mostra "Copiada" e um aviso.
  - Se o navegador negar a área de transferência, o campo abre com o texto selecionado para Ctrl+C.
- **"Ver o texto completo ⌄"**
  - Abre um campo só de leitura com a transcrição inteira.
  - Ao clicar no campo, o texto fica selecionado.
- A lista de falas continua igual.

## Critérios de aceite

- [ ] O botão copia a transcrição completa, mesmo com mais de mil falas.
- [ ] O campo mostra o mesmo texto, pronto para selecionar.
- [ ] Alvos de 44 px; funciona no celular.
- [ ] `bun run build`, `bun run lint` e os testes passam.
