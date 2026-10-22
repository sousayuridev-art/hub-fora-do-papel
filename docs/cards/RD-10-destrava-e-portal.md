# Card RD-10 · "O que destrava o projeto" e fontes do portal (22/10)

> **Pedido do Yuri em 22/10 ("FAÇA!"):** itens 5 e 6 da lista de design do Hub.
> **Status:** aprovado; implementação em 22/10.

## 5. Bloco "O que destrava o projeto" (ficha do projeto)
Desenho aprovado no canvas do redesenho (`docs/redesenho/canvas/Projeto.dc.html`) e na análise (`docs/redesenho/analise-8-menus.md`, seção Projetos).

- **Posição:** logo abaixo do cabeçalho da ficha do projeto, antes das fases.
- **Lado esquerdo, a ação principal única do momento**, calculada a partir dos dados que já existem, nesta ordem de prioridade:
  1. entrega aprovada pelo cliente e ainda não publicada → "Publicar o módulo/fase X" ("Aprovado por [nome] em [data, hora]");
  2. fase pronta sem pedido de aprovação → "Pedir aprovação da fase X";
  3. Pedido de ajuste novo sem classificação → "Classificar o pedido de ajuste";
  4. Serviço adicional aprovado e não iniciado → "Começar o serviço adicional X";
  5. tarefa atrasada do projeto → "Resolver a tarefa atrasada X";
  6. nada disso → "Nada travado. Próximo passo: [primeira tarefa a fazer]".
  Botão âmbar só para a ação (é a ação principal da tela); o texto de apoio diz o porquê em uma linha.
- **Lado direito, o que está com o cliente:** "Com [nome do responsável]: [aprovação da fase X / pagamento da parcela Y / conteúdo pedido]" ou "Com [nome]: nada pendente".
- **Dados:** RPC `projeto_destrava(p_projeto uuid)` (`security definer`, valida `_projeto_do_dono`, só leitura), devolvendo `{acao: {tipo, titulo, apoio, alvo}, com_cliente: [{tipo, texto}]}`. Nada de cálculo no cliente.
- **Celular:** os dois lados empilhados; botão em largura total.
- Teste de banco cobrindo cada prioridade e outro tenant sem acesso.

## 6. Fontes do portal do cliente
Decisão de 22/10: o cliente que vem do site e da proposta não pode sentir duas marcas.
- **Portal (`/portal/*`), proposta pública, página de serviço adicional e telas de entrada do cliente:** texto, rótulos e botões em **Geist**; títulos principais em **Bricolage Grotesque** (como já é hoje). Números em Geist com `tabular-nums`.
- **Hub interno (`/app/*`):** continua em Poppins.
- Carregar Geist com `display=swap` só nas rotas do cliente (sem aumentar o pacote do Hub interno); conferir que os textos mínimos de 12,5 px seguem legíveis (Geist é mais estreita).
- Atualizar o `CLAUDE.md` (seção Visual do Hub) com a regra nova.

## Critérios de aceite
- [ ] O bloco mostra a ação certa para cada um dos 6 casos (teste de banco) e o que está com o cliente.
- [ ] Botão do bloco leva à ação (abre o painel ou a aba certa).
- [ ] Portal e proposta pública em Geist + Bricolage; `/app` continua em Poppins.
- [ ] 360, 768 e 1280 px sem rolagem lateral; alvos ≥ 44 px; texto ≥ 12,5 px.
- [ ] `bun run build`, `bun run lint`, `bun run test` e `supabase test db` passam.
