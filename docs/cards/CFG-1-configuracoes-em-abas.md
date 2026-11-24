# CFG-1 · Configurações em abas

> Pedido do Yuri em 24/11/2026: a tela de Configurações do Hub no formato das configurações do sistema da Plamev, uma aba por assunto.

## O que muda

- As seções ficam em abas no topo, no lugar da página longa:
  - Preços;
  - Recebimento;
  - Google Meet;
  - Segurança;
  - Avançado.
- A aba aberta fica no endereço (`?aba=google`). Os links de outras telas abrem direto na aba certa:
  - Reuniões → Google Meet;
  - Financeiro → Recebimento.
- A volta da permissão do Google abre na aba Google Meet.
- O estilo é o das abas do Hub (sublinhadas, card RD-0), igual a Reuniões. No celular, as abas rolam de lado.
- O conteúdo de cada seção não muda.

## Critérios de aceite

- [ ] Uma aba por assunto; trocar de aba não recarrega a página.
- [ ] Links de Reuniões e Financeiro abrem na aba certa.
- [ ] `bun run build`, `bun run lint` e os testes passam.
