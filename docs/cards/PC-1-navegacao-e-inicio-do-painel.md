# Card PC-1 · Navegação do painel e novo Início

> **Origem:** PRD `PC-0` (27/10). Protótipo de referência: Lovable "Painel Fora do Papel" (telas Início e menu lateral).
> **Decisões:** menu único por tarefa, montado pelos módulos contratados do site (Yuri, 27/10). Perfis e permissões continuam os do CX-0.

**Objetivo:** o portal passa a ser o painel do cliente: menu lateral no computador, abas no celular, e um Início que diz o que fazer hoje no projeto e no site.

**Não entra:**
- Telas novas de conteúdo, contatos e ajustes (PC-3 a PC-6). Aqui os itens desses menus aparecem com "Em breve" (`emBreve`), como o menu do Hub já faz.
- Troca de empresa para quem tem duas (fica no P1 do PC-0).

## Requisitos
### Banco (`supabase/migrations/[data]_pc1_sites_cliente.sql`)
- `sites` (CMS-1) ganha `modulos text[]` (valores: `paginas`, `artigos`, `portfolio`, `loja`, `contatos`) com padrão `{paginas,contatos}`. Sites de cliente têm `client_id` preenchido.
- RPC `portal_sites()` (`security definer`): devolve os sites da empresa da pessoa logada (nome, domínio, módulos, se está no ar). Equipe e responsável leem; outra empresa e outro tenant, nada.
- RPC `portal_inicio()` passa a devolver também o bloco do site: contatos sem resposta, passos para completar o site e situação do site (no ar ou não). Sem dinheiro para a equipe (regra do CX-0 continua).
- Hub › ficha do cliente: o Yuri liga o cliente a um site e escolhe os módulos (RPC `site_cliente_definir(p_site, p_cliente, p_modulos)`, só dono, com evento `site.cliente_definido`).

### Telas
- **Menu do portal** (`src/components/layout/navegacao.ts`, `menuPortal`): grupos na ordem
  - Início;
  - **Meu site:** Páginas, Artigos, Portfólio, Fotos e arquivos (cada um só se o módulo estiver contratado);
  - **Loja:** Produtos, Vendas, Cupons (só com `loja`; o nome é "Vendas" para não confundir com "Pedidos de ajuste");
  - **Clientes:** Contatos, Desempenho;
  - **Fora do Papel:** Aprovações, Pedidos de ajuste, Pagamentos (só responsável), Arquivos — as telas que já existem, sem mudança de comportamento;
  - Ajustes.
- **Computador:** menu lateral escuro igual ao do Hub (HUB-VIS-2): #0E1013 com brilho azul-marinho no topo, item ativo em âmbar #FFB020 com texto escuro, conta em cartão no rodapé. Nome do grupo em frase normal, **sem caixa alta** (regra das páginas do cliente). Seletor do site abaixo da marca.
- **Celular:** continua o padrão do card P: abas embaixo com Início, Meu site, botão central "Criar", Contatos e Mais (o resto do menu em bottom sheet). Equipe não vê Pagamentos em lugar nenhum.
- **Início** (`/portal`), nesta ordem:
  1. Capa escura (Direção A) com o nome da empresa, o site e "No ar em [domínio]"; botões "Editar site" (principal) e "Ver site".
  2. "Precisa da sua atenção": junta as ações de hoje do `portal_inicio()` (aprovações, pendências, serviços adicionais, contas) com contatos sem resposta e passos do site. Cada linha leva direto à tarefa. A soma é a mesma do selo (regra do card P).
  3. Ações rápidas, por módulo: Trocar foto da capa, Novo produto, Escrever artigo, Mudar horário de atendimento, Pedir um ajuste.
  4. Linha do projeto (como hoje) quando houver projeto em andamento.
  5. Saúde do site (no ar, conexão segura, cópia de segurança) — textos vindos do banco; enquanto não houver medição, mostrar só "No ar" e "Conexão segura".
- Cliente sem site ligado: o menu mostra só Início, Fora do Papel e Ajustes; o Início fica como o de hoje.
- Botão principal com o degradê da marca (decisão do Yuri, 27/10); o resto em âmbar sólido e tinta.

## Critérios de aceite
- Dado um cliente com site de módulos `{paginas, artigos, contatos}`, quando o responsável entra, então vê Meu site (Páginas, Artigos, Fotos e arquivos), Clientes e Fora do Papel, e não vê Loja.
- Dado o mesmo cliente, quando alguém da equipe entra, então não vê Pagamentos no menu, nas abas nem no Início, e `/portal/pagamentos` explica que fica com o responsável.
- Dado um cliente sem site, então o menu não tem Meu site, Loja nem Clientes.
- O número de "Precisa da sua atenção" é igual à soma dos selos.
- Pessoa de outra empresa chamando `portal_sites()` recebe lista vazia (teste de banco).
- Se `portal_sites()` falhar, o menu mostra Início, Fora do Papel e Ajustes, e o aviso tem "Tentar de novo"; nada do portal atual deixa de funcionar.
- A 390 px, sem rolagem lateral; alvos de 44 px.
- pgTAP `supabase/tests/pc1_sites_cliente.test.sql` passa; `bun run build`, `bun run lint` e `bun run test` passam.

## Para o Yuri depois de publicar
- Ligar cada cliente ao site dele e escolher os módulos na ficha do cliente.
- Abrir o portal como responsável e como equipe (contas de teste) e conferir os menus.
