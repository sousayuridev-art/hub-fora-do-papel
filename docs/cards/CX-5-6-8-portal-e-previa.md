# CX-5, CX-6 e CX-8 · Portal na direção A e prévia do link

Aprovado em 20/10/2026 (canvas telas 8 a 14 e direção A, "Capa escura e papel por cima").

## CX-5 · Início do portal
- Cabeçalho escuro e sólido em todo o portal; menu com a aba ativa clara.
- Início com capa escura de ponta a ponta:
  - saudação pela hora ("Boa tarde, Marina.", em Bricolage);
  - uma frase com o número do "Precisa de você" (mesma conta dos selos);
  - nome do projeto e data de lançamento.
- Linha do projeto com o símbolo: etapa concluída = quadrado cheio com ✓, atual = papel em contorno + quadrado âmbar, próxima = contorno. No celular, só os marcos e a etapa atual por extenso.
- Folha clara que sobe sobre a capa, com "Precisa de você":
  - a primeira decisão em destaque, com o único botão âmbar ("Ver e decidir");
  - as outras decisões em linha e as pendências com "Já fiz";
  - a conta a pagar numa linha discreta, só para o responsável, a 5 dias do vencimento.
- Responsável sempre à vista: nome, "Falar no WhatsApp" (número do perfil do dono da agência) e "Fazer um pedido de ajuste".
- Sem nada pendente, o Início diz "Nada depende de você agora. Avisamos quando precisar."
- Títulos das telas do portal em Bricolage; rótulos sem caixa alta.

## CX-6 · Aprovação e pagamentos
- Entrega: título em Bricolage, prévia em tela cheia em destaque, "Aprovar esta entrega" em âmbar e "Pedir ajuste" com contorno, empilhados no celular. Depois da decisão, o registro fica visível ("Aprovação registrada em…").
- Pagamentos:
  - sem total do projeto nem "Falta";
  - a próxima conta vem primeiro, como recibo de papel (borda serrilhada) sobre a capa escura, com o valor grande, "Copiar código Pix" em âmbar e o QR Code ao lado no computador (no celular, em "Mostrar QR Code");
  - "Já paguei" logo abaixo.

## CX-8 · Prévia do link
- `/proposta/$token`, `/portal` e `/entrar` mandam título, frase e imagem fixos (Open Graph, 1200×630 em `public/og/`). Não levam nenhum dado do cliente; a prévia do WhatsApp não chama o banco, então não marca a proposta como aberta.
- O endereço vem de `VITE_ENDERECO_PUBLICO` (padrão: `https://spring-board-kit.lovable.app`).
- Tela de entrada sobre a capa escura; vinda do portal, diz "Entrar no seu portal" e aceita o e-mail preenchido.

## Critérios de aceite
- [x] Conferido no navegador com dados de exemplo:
  - Início do responsável (computador e celular), da equipe (4 abas, sem valores) e sem pendências;
  - aprovação no celular;
  - pagamentos (computador e celular);
  - tela de entrada.
- [x] Meta tags conferidas no HTML do servidor.
- [x] `bun run build`, `bun run lint`, `bun run test` (22 testes, incluindo o painel "Enviar para").
- [ ] No ar: conferir a prévia colando o link num WhatsApp.
