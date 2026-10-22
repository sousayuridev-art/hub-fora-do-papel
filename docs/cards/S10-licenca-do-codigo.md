# Card S10 · Licença do código em sistemas sob medida (22/10)

> **Decisão do Yuri em 22/10:** em sistemas sob medida, o cliente fica ligado à Fora do Papel pela licença do código e pela Mensalidade. Os dados nunca ficam presos.
> **Par no site:** card SITE-12 (repositório `fora-do-papel-blueprint`).
> **Status:** texto para aprovação. As condições gerais dependem da revisão de um advogado, e nada vai ao ar antes disso.

## Visão de negócio
Hoje a proposta promete que "o código fica em nome da sua empresa" e que, "se a parceria acabar, você leva tudo". Com isso, o cliente pode levar o sistema para outro fornecedor sem custo e você perde o direito de reaproveitar os componentes do Hub. O modelo novo separa duas coisas:
- **Dados:** sempre do cliente, exportáveis a qualquer momento. A LGPD trata a empresa do cliente como controladora; nós somos operadores.
- **Código:** nosso. O cliente tem uma licença de uso enquanto a Mensalidade estiver ativa e pode comprar o código pelo valor que a proposta informar.

**Métrica de sucesso:** nenhuma proposta nova sai sem o modelo de propriedade escolhido. A objeção "e se eu quiser sair?" é anotada nas conversas e revista em 30/11.

## A política (o que cada parte tem)
| | Fica com o cliente | Fica com a Fora do Papel |
| --- | --- | --- |
| Dados (clientes, vendas, histórico, arquivos) | Sempre. Exportação em planilha quando pedir, sem custo, em até 5 dias úteis | Nada; apaga tudo 30 dias depois do fim, após a exportação |
| Domínio e contas das ferramentas (WhatsApp, e-mail, pagamento) | Em nome dele | Acesso de administrador enquanto houver contrato |
| Servidor e banco | Paga o custo (hospedagem à parte, pelo custo) | Na conta da Fora do Papel |
| Código do sistema | Licença de uso enquanto a Mensalidade estiver ativa | Propriedade do código e dos componentes reaproveitáveis |
| Saída | Aviso de 30 dias; a migração para outro fornecedor é um Serviço adicional com orçamento | Entrega dos dados e apoio na migração, se contratado |

**Sites e lojas** continuam como hoje: no fim, tudo fica com o cliente.

## Requisitos

### 1. Proposta: escolher o modelo (Hub, editor da proposta)
- Campo novo **"O que fica com o cliente"**, no bloco de pagamento, com duas opções:
  - **Tudo fica com o cliente** (padrão para sites e lojas);
  - **Código licenciado** (padrão para sistemas sob medida).
- Com "Código licenciado", aparece o campo **"Valor da compra do código"** (em centavos, opcional). Vazio = "sob orçamento".
- O padrão vem do tipo de projeto quando houver; sem tipo, a proposta não pode ser enviada sem escolher (aviso em "Antes de enviar").
- **Banco:** colunas `ownership_model text check (ownership_model in ('cliente','licenca'))` e `code_buyout_cents integer` em `proposals`. Entram no retrato enviado ao cliente (`_proposta_documento`), em `condicoes.propriedade` e `condicoes.compra_codigo_cents`. Alteração só pela RPC de edição que já existe, com as mesmas validações de tenant e situação.

### 2. Proposta pública: texto "O que é seu" (`SecoesValores.tsx`, `BlocoGarantia`)
- **Retrato sem `propriedade`** (propostas antigas): mostra o texto antigo, sem mudança. Nada já enviado ou aceito muda de sentido.
- **`propriedade = "cliente"`:** o texto antigo.
- **`propriedade = "licenca"`:** título **O que é seu**, com o texto:
  > Os dados do sistema são da sua empresa, e você pode exportá-los quando quiser. O domínio e as contas das ferramentas ficam em nome da sua empresa. O código é da Fora do Papel e você usa o sistema com uma licença enquanto a mensalidade estiver ativa. Se preferir ficar com o código, a compra custa [valor] *(ou: "tem orçamento sob pedido")*. Se a parceria acabar, entregamos os seus dados e, se você quiser, ajudamos na mudança como serviço adicional.
- O "Li e concordo" do aceite cita as condições gerais na versão vigente (já previsto no CX-11).

### 3. Condições gerais e contrato (CX-11)
O CX-11 já prevê condições gerais com versão. Este card define o que a parte de propriedade precisa cobrir. **Rascunho para o advogado, não para publicar:**
1. Propriedade intelectual do código e dos componentes reaproveitáveis com a Fora do Papel; licença de uso não exclusiva e intransferível enquanto a Mensalidade estiver em dia.
2. O que acontece com a licença em caso de atraso (prazo de tolerância antes de suspender) e no fim do contrato.
3. Opção de compra do código pelo valor da proposta, com cessão dos direitos patrimoniais depois do pagamento.
4. Dados: o cliente é controlador e a Fora do Papel é operadora. Cuidamos dos dados conforme as instruções do cliente, entregamos tudo exportado no fim e apagamos 30 dias depois. Isso pede um contrato de tratamento de dados.
5. Aviso prévio de 30 dias, prazo mínimo da Mensalidade (6 ou 12 meses, conforme o nível) e migração como Serviço adicional.
6. Continuidade: o que acontece se a Fora do Papel encerrar as atividades (por exemplo, entrega do código ao cliente). Isso reduz a objeção de quem contrata uma empresa de uma pessoa.

## Casos de borda
- Proposta reaberta depois do aceite: o retrato novo leva o modelo escolhido na nova versão.
- Proposta com "Código licenciado" e sem Mensalidade: bloqueada em "Antes de enviar" ("A licença depende da mensalidade").
- Cliente pede os dados no meio do contrato: exportação sem custo; não é Serviço adicional.

## Critérios de aceite
- [ ] Teste de banco: o modelo e o valor de compra entram no retrato; proposta sem modelo não é enviada; outro tenant não altera.
- [ ] Proposta antiga continua com o texto antigo; proposta nova mostra o texto do modelo escolhido.
- [ ] "Código licenciado" sem Mensalidade não é enviada.
- [ ] Valor da compra em centavos, mostrado como R$ 1.500 (vazio = "orçamento sob pedido").
- [ ] Texto sem marcador visível ao cliente.
- [ ] `bun run build`, `bun run lint`, `bun run test` e `supabase test db` passam.

## Depende do Yuri
- [ ] Aprovar os textos acima.
- [ ] Levar a política e o rascunho do item 3 a um advogado antes do primeiro contrato com licença.
- [ ] Decidir o prazo de tolerância do atraso antes de suspender a licença (sugestão: 30 dias).
