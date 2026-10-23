# Card RD-11 · Pendências de acabamento (23/10)

> **Origem:** sobras do RD-9 e RD-10 vistas na conferência de 23/10. Pedido do Yuri: "Faça".
> **Status:** aprovado em 23/10.

## Visão de negócio
Quatro detalhes que fazem o Hub parecer inacabado na frente do cliente e no uso diário. Nenhum muda regra de negócio.

## Requisitos
1. **Abas da página do projeto dentro do cabeçalho** (`src/routes/app/projetos/$id.tsx`). Hoje as abas ficam soltas abaixo do cabeçalho. Devem fazer parte do bloco do cabeçalho da página (mesmo fundo e borda inferior), alinhadas à esquerda com o título, com rolagem horizontal no celular, sem barra visível, e alvo de 44 px.
2. **Campo "O que fizemos" no painel de pedir aprovação** (`PedirAprovacaoPainel.tsx`) não pode estourar a largura em 360 px. Campo e contador com `min-w-0` e largura total; texto longo quebra linha. Conferir o mesmo campo no cartão do portal (`EntregaCartao.tsx`).
3. **Frase de "O que destrava"**: quando o item vem de uma tarefa (ex.: "Enviar a lista de lojas"), a primeira letra entra minúscula no meio da frase ("…depois de enviar a lista de lojas"). Ajustar onde a frase é montada (RPC `projeto_destrava` ou componente `ProjetoDestrava.tsx`, o que for a fonte da frase). Siglas e nomes próprios: só baixar a primeira letra quando a segunda também for minúscula. Atualizar o teste `supabase/tests/rd10_destrava.test.sql` se a mudança for no banco.
4. **Rótulo do funil**: "Sites e lojas virtuais" vira "Sites" em `src/lib/funil.ts` (e em qualquer outro texto visível do Hub com o mesmo rótulo). O valor gravado no banco não muda.

## Casos de borda
- Projeto com muitas abas em 360 px: rolam na horizontal, a ativa fica visível ao abrir.
- Tarefa com título em sigla ("NF de outubro"): fica como está.

## Critérios de aceite
- [ ] 360, 768 e 1280 px sem rolagem lateral na página do projeto e no painel de aprovação.
- [ ] Frase do bloco "O que destrava" com o item em minúscula no exemplo da lista de lojas e sigla preservada.
- [ ] Funil mostra "Sites".
- [ ] `bun run build`, `bun run lint` e, se mexeu no banco, `supabase test db` passam.
