# Card RD-12 · Campo de dinheiro com R$ e formato brasileiro (23/10)

> **Origem:** print do Yuri em "Novo contato": o campo "Valor estimado (opcional)" mostra "9000", sem R$ e sem ponto de milhar. Regra geral registrada na skill `dinheiro-pt-br`.
> **Status:** aprovado em 23/10.

## Visão de negócio
Valor digitado sem R$ e sem separador gera erro de leitura (9000 ou 900,0?) e passa impressão de sistema inacabado. Todo campo de dinheiro do Hub segue um padrão só.

## Requisitos
1. **Componente `src/components/hub/CampoDinheiro.tsx`**, com a mesma API base do `CampoNumero` (`rotulo`, `valor` em **centavos**, `aoMudar(centavos | null)`, `ajuda`, `placeholder`, `bloqueado`, `rotuloOculto`, `className`).
   - "R$" fixo à esquerda, dentro da borda do campo, e fora do texto editável.
   - Enquanto a pessoa digita: ponto de milhar inserido na hora ("9000" → "9.000"; "1500000" → "1.500.000"). Vírgula aceita uma vez, com até 2 casas ("9.000,5"). O cursor não pula para o fim ao inserir o ponto.
   - Ao sair do campo: completa com 2 casas ("9.000" → "9.000,00"). Campo vazio continua vazio (null), não vira "0,00".
   - Colar "R$ 9.000,50", "9000.50", "9.000" ou "9000" grava 900050, 900050, 900000 e 900000 centavos. Ponto seguido de exatamente 3 dígitos é milhar; ponto seguido de 1 ou 2 dígitos no fim é decimal.
   - Só aceita dígitos, ponto e vírgula; letras são ignoradas. Valor negativo só com a propriedade `permitirNegativo`.
   - `inputMode="decimal"`, `autoComplete="off"`, `tabular-nums`, 16 px no celular, altura 44 px.
2. **Funções puras em `src/lib/formatar.ts`** (ou `src/lib/dinheiro.ts`): `textoDinheiroDigitando(texto)` e `centavosDoTexto(texto)` (já existe, revisar para as regras acima), com testes em `src/test/`.
3. **Trocar todos os campos de valor em reais** pelo `CampoDinheiro`. No mínimo:
   - `funil/NovoContatoPainel.tsx` (Valor estimado);
   - `clientes/ValorDiagnosticoPainel.tsx`;
   - todo uso de `CampoNumero` com `prefixo="R$"` ou `escala={100}` (propostas, preços, pedidos, serviço adicional, cancelamento, tráfego).
   
   Listar no relatório cada arquivo trocado. `CampoNumero` continua para horas, %, dias.
4. **Exibição**: valores mostrados fora de campos usam `moeda()` (R$ 9.000,00 ou o padrão já adotado pelo Hub); procurar valores em reais exibidos sem R$ ou sem separador e corrigir.

## Casos de borda
- Apagar tudo: vira null, sem "R$ 0,00" forçado.
- Valor vindo do banco com centavos (900050) aparece "9.000,50".
- Digitar vírgula primeiro (",5") vira "0,5" e, ao sair, "0,50".
- Número muito grande (> 12 dígitos) é recusado sem quebrar o layout.

## Critérios de aceite
- [ ] Em "Novo contato", digitar 9000 mostra "R$ 9.000" e, ao sair, "R$ 9.000,00"; o banco recebe 900000.
- [ ] Testes das funções puras cobrindo os casos acima.
- [ ] Nenhum `CampoNumero` com `prefixo="R$"` sobrando (`grep`).
- [ ] 360 px sem rolagem lateral nos painéis alterados.
- [ ] `bun run build`, `bun run lint` e `bun run test` passam.
