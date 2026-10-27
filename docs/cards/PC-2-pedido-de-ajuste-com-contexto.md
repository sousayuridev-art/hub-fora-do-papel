# Card PC-2 · Pedido de ajuste com página e anexo

> **Origem:** PRD `PC-0` (27/10). Pedido do Yuri: "todos os ajustes solicitados no painel aparecem no Hub, no menu Pedidos de ajuste".
> **Decisões:** reaproveitar a tabela `requests` e o fluxo do S3 (classificar, estimar, enviar ao cliente). Nenhuma fila nova.

**Objetivo:** o cliente pede um ajuste a partir de qualquer tela do painel, já dizendo a página e anexando um print, e o pedido aparece em Entregar › Pedidos de ajuste do Hub com esse contexto.

**Não entra:**
- Mudança no fluxo de classificação, estimativa e aprovação de serviço adicional (já existe no S3).
- Aviso por WhatsApp (S6/CX-10).

## Requisitos
### Banco (`supabase/migrations/[data]_pc2_pedido_contexto.sql`)
- `requests` ganha `site_id uuid null` (FK `sites`) e `contexto jsonb null` com `{ "pagina": "Página inicial", "secao": "Capa", "tela": "/portal/site/paginas/inicio" }`.
- `requests.origem` aceita o valor novo `painel` (além de `portal`, `whatsapp`, `reuniao`, `hub`).
- RPC do portal que cria pedido (a mesma usada por `fazerPedido` em `src/lib/portal.ts`) ganha parâmetros opcionais `p_site`, `p_contexto` e `p_anexos` (caminhos já enviados ao Storage). Valida que o site é da empresa da pessoa; senão recusa (`site_de_outra_empresa`, 42501).
- Anexos: até 3 arquivos por pedido (jpg, png, webp, pdf, até 5 MB cada), na pasta da empresa no Storage usado por "Arquivos" (S8/EnviarArquivos), ligados ao pedido.
- Mesmo limite de pedidos sem corrida que o S3 já aplica. Evento `pedido.criado` com `origem = painel` e o contexto.

### Telas
- **Painel (portal):** "Pedir um ajuste" em três lugares — Fora do Papel › Pedidos de ajuste (já existe "Fazer um pedido"), Ações rápidas do Início e a barra do editor de páginas (PC-4). O painel lateral (`FazerPedidoPainel`) ganha:
  - "Em qual página?" (lista das páginas do site; já vem preenchida quando o pedido nasce dentro do editor);
  - "Anexar print ou arquivo";
  - frase de ajuda: "Algo maior? Mandamos um orçamento de serviço adicional para você aprovar antes de começar."
- **Hub › Pedidos de ajuste (`/app/pedidos`):** na lista, a origem mostra "Painel · [página]" no lugar de "Portal". No painel do pedido (`PedidoPainel`), um bloco "Onde" com site, página, seção e os anexos para abrir.
- Filtro de origem na lista inclui "Painel".

## Critérios de aceite
- Dado um responsável no editor da Página inicial, quando ele pede "trocar o banner" com um print, então o pedido aparece em `/app/pedidos` com código da empresa, origem "Painel · Página inicial" e o print abre no painel do pedido.
- Dado alguém da equipe, quando faz o pedido, então o pedido entra normalmente, mas a equipe não vê valor nem horas depois que o Yuri classifica (regra do CX-0).
- Chamada com `p_site` de outra empresa é recusada (teste de banco).
- Anexo acima de 5 MB ou formato fora da lista é recusado antes do envio, com o motivo.
- Sem rede no envio: o texto digitado continua no painel e o aviso tem "Tentar de novo".
- pgTAP `supabase/tests/pc2_pedido_contexto.test.sql` passa; `bun run build`, `bun run lint`, `bun run test` passam.

## Para o Yuri depois de publicar
- Fazer um pedido de teste pelo painel com print e conferir em Pedidos de ajuste.
