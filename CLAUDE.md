# Fora do Papel · regras do projeto

Lidas pelo Claude Code em todo pedido. Cards em `docs/cards/`; cite o card no pedido.

## Fluxo de trabalho (não pular etapas)
1. Especificação (Claude): PRD e card com requisitos e critérios de aceite. Sem card, não implemente; peça o card.
2. Implementação (Claude Code): só o que o card pede. Mudança fora do card = avisar antes de fazer.
3. Teste local: `bun run dev` e Supabase CLI. Migrações sempre em `supabase/migrations`, nunca direto no painel.
4. Push para o GitHub.
5. Lovable: só publicação. Nada de editar código ou banco por lá (ele grava direto no GitHub e gera conflito); sem Lovable Cloud, o banco é o nosso Supabase.

## Stack
- TanStack Start (base exigida pelo Lovable) com rotas por arquivo em `src/routes` (TanStack Router), React 19, TypeScript estrito (sem `any`), Tailwind 4, shadcn/ui, ícones Lucide. Gerenciador de pacotes: `bun`.
- Áreas logadas com `ssr: false` e proteção no `beforeLoad` (`exigirPapel` em `src/lib/acesso.ts`). Nunca use `<Navigate>` no render para proteger rota.
- `routeTree.gen.ts` é gerado sozinho; não edite.
- Dados: Supabase (Postgres, Auth, Storage) + TanStack Query.
- Conteúdo de sites: Sanity.io.
- Integrações: eventos gravados em `event_outbox` e consumidos pelo n8n (Pipedrive, ChatGuru/WhatsApp).

## Segurança e dados
- Toda tabela tem `tenant_id` e RLS ativa. O isolamento é feito pelas policies do Postgres, nunca por filtro no frontend.
- O cliente nunca faz `update` direto em tabelas de estado: usa RPC (`security definer`) que valida tenant, situação e grava o evento na mesma transação.
- Valores em dinheiro em centavos (`integer`). Datas em `timestamptz`.
- Agregações e métricas em views ou RPCs, não em `.reduce()`/`.filter()` no cliente.
- Nunca colocar chaves (service role, tokens) no frontend ou em logs.

## Frontend
- Toda query e mutação via TanStack Query, com chaves organizadas por recurso.
- Mutações de ação do usuário com atualização otimista e rollback no erro.
- Todo fetch/mutação com try/catch e retorno visual (toast) em caso de erro.
- Listas longas (tabelas de CRM, catálogos, backlog) com `@tanstack/react-virtual`.
- Componentes pequenos, um por arquivo: `Board`, `Column`, `Card`, `Sidebar`…
- Painéis laterais (Sheet) em vez de modais para conteúdo complexo; bottom sheet no celular.
- Alvos de toque com no mínimo 44px; funciona em largura de celular.
- Meta: Lighthouse 100 em sites públicos (imagens otimizadas, fontes com `display=swap`, sem JS desnecessário).

## Texto para o cliente
- Sempre em português, simples e direto. Sem termos em inglês quando houver opção clara em português.
- Glossário: "Serviço adicional" (nunca "aditivo" para o cliente), "Mensalidade" (não "manutenção"), "Pedidos de ajuste", "Aprovações".
- Sem números, depoimentos ou dados inventados: use marcadores como [PREÇO].

## Visual do Hub (sistema interno)
- Fundo #F5F5F2, texto #0E1013, destaque #FFB020 só na ação principal.
- Títulos Bricolage Grotesque, texto Geist, rótulos IBM Plex Mono.
- Situações: neutro #F1F1EC/#2A2D33, informação #E5EDFF/#1E3FA8, atenção #FFF1D6/#7A4200, risco #FDE8E6/#9A1C12, concluído #E3F4EA/#145A37.

## Portal do cliente no celular (até 767 px; acima disso nada muda)
- Detalhes e medidas: `docs/cards/P-portal-celular.md`. Tudo com prefixo `max-md:` ou dentro de `@media (max-width: 767px)`.
- Cabeçalho de 56 px fixo no topo (logo + nome da empresa + avatar). O menu vira `PortalTabs` embaixo: 5 abas com ícone e nome, 64 px + área segura.
- Telas de decisão (Proposta, Serviço adicional) trocam as abas por `ActionBar` (valor + botão). O botão leva ao bloco de aceite; nunca aceita direto.
- Barras fixas somem com o teclado aberto; a página reserva espaço embaixo para elas.
- Títulos: h1 28 px, h2 20 px; nenhum texto abaixo de 12,5 px. Campos com 16 px e `inputMode`/`autoComplete` corretos.
- Botões principais em largura total; botões de decisão empilhados com a mesma largura.
- Selos da barra = mesma regra do contador "Precisam de você" (soma igual).

## Ao responder
- Antes de muitos arquivos, liste o plano em 3–5 linhas.
- Rode `bun run build`, `bun run lint` e, se mexeu no banco, `supabase test db` antes de dizer que terminou.
- Cite os arquivos alterados no fim. Não reescreva arquivos inteiros para mudar poucas linhas.
