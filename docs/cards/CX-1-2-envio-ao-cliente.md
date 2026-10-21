# CX-1 e CX-2 · Mensagens prontas e painel "Enviar para"

Aprovado em 20/10/2026 ("Antes: o envio", canvas telas 1 a 3; textos na seção "Nova experiência de envio" do documento).

## Requisitos
1. **CX-1:** todos os textos ao cliente saem de `src/lib/mensagens.ts`, com a voz da marca:
   - WhatsApp: saudação com o nome, uma linha de contexto, o link e o próximo passo; no máximo uma exclamação.
   - E-mail: assunto que diz o conteúdo, resumo em tópicos, próximo passo, assinatura; sem emoji e sem exclamação.
   - Fluxos: proposta, convite do portal, entrega para aprovar, serviço adicional, lembrete com vários itens, cobrança (antes, no dia, atrasada) e recibo.
2. **CX-2:** painel lateral "Enviar para [nome]" (bottom sheet no celular):
   - abas WhatsApp e E-mail;
   - prévia de como o link chega;
   - texto pronto e nota pessoal opcional;
   - ação principal "Abrir no WhatsApp" ou "Abrir no e-mail" e "Copiar link" como secundária.
   - Sem número ou e-mail cadastrado, o botão vira "copiar texto".
3. O e-mail sai do aplicativo de e-mail de quem envia (`mailto:`). E-mail automático com a marca depende de SMTP (CX-9).
4. O aviso "Você vê aqui quando [nome] abrir" só aparece na proposta, que registra a abertura.
5. Onde entra:
   - proposta enviada ("Enviar para [nome]");
   - convite do portal (ícone de enviar; convite de equipe vai por e-mail, porque o WhatsApp cadastrado é o de quem contratou);
   - "Aguardando o cliente" no projeto ("Avisar [nome]": um item só ganha a mensagem própria, vários viram lembrete);
   - cobrança (lembrete e "Avisar que o recibo está pronto").

## Critérios de aceite
- [x] `src/test/mensagens.test.ts`: nome, link, validade, assunto, nota depois da saudação, exclamações e emoji, cobrança atrasada, e-mail válido.
- [x] `bun run build`, `bun run lint`, `bun run test`.
- [ ] Conferir no navegador (computador e celular) na validação final.
