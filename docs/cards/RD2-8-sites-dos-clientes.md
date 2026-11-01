# RD2-8 · Sites: a central dos sites que entregamos · PRD + card (rascunho para aprovação)

> **Decisões do Yuri (01/11):**
> - "Ver como o cliente" abre o **portal de verdade, em modo leitura** (não uma simulação).
> - Situação do site decidida pelo Claude, com aval do Yuri: **No ar** = `sites.no_ar` (marca sozinho quando o projeto do cliente é lançado);
>   **Em construção** = fora do ar com projeto em andamento; **Fora do ar** = o resto.
> - Não há site de cliente fora do banco do Hub; todos entram com conteúdo.
> **Telas:** canvas "Hub · redesign das áreas", quadros 12 (Sites, Página do site, Ver como o cliente). Aguardando aprovação.

## Problema
O menu Sites abre direto o editor do site da Fora do Papel. Os sites dos clientes ficam num seletor pequeno e a ligação
site ↔ cliente está no fim da página do cliente. O que o cliente faz no próprio site (publica, troca foto, recebe contato)
não aparece reunido em lugar nenhum, então o Yuri não sabe quem usa o painel, quem precisa de ajuda nem o que mudou.

## Requisitos
### Lista `/app/site` (vira a central)
- Números: sites no ar, contatos sem resposta (com o mais antigo), publicações dos clientes em 30 dias, pedidos de ajuste dos sites abertos.
- Abas: Todos, No ar, Em construção, Pedem atenção (contato sem resposta > 2 dias, cliente sem entrar > 14 dias, rascunho parado > 7 dias).
- Cartão por site: miniatura, logo ou sigla, nome, domínio, situação, 3 números e o aviso mais importante. O da Fora do Papel primeiro.
- "Novo site": nome, domínio, cliente (opcional) e módulos.

### Página do site `/app/sites/$id`
- Cabeçalho: domínio, situação, cliente (link), "Abrir o site", "Ver como o cliente" (principal).
- Abas: Visão geral, Páginas, Artigos, Fotos, Contatos (os editores que já existem, agora por site) e "O que o cliente pode editar"
  (módulos e no ar; sai da página do cliente).
- Visão geral: Precisa de você; O que o cliente fez no site (eventos com quem fez, 30 dias); Contatos pelo site (mês, formulário, WhatsApp);
  Situação (no ar, conexão segura, última publicação, rascunhos, fotos sem descrição); Quem usa o painel (último acesso).
- Página do cliente: só um cartão "Site" com domínio e situação, levando à página do site.

### Ver como o cliente (portal em modo leitura)
- Rota do portal aberta pelo dono com `?espelho=<cliente>&perfil=responsavel|equipe`; faixa âmbar fixa no topo
  ("Você está vendo o portal da [empresa] como [pessoa] vê. Modo leitura") com "Ver como" e "Voltar ao Hub".
- Banco: `_portal_cliente_leitura(p_cliente)` aceita o dono do tenant **só nas RPCs de leitura** do portal
  (início, sites, aprovações, pedidos, pendências, arquivos, pagamentos, contatos, ajustes, artigos, fotos, páginas).
  As RPCs que gravam continuam com `_portal_cliente` (só pessoas do portal): o dono nunca aprova nem responde como o cliente.
- Perfil equipe no espelho: o banco aplica a mesma regra de dinheiro da equipe (sem Pagamentos nem valores).
- Toda abertura grava `portal.espelho_aberto` (quem, cliente, perfil) no `event_outbox`.
- Na tela: todos os botões que gravam ficam desligados com "Só leitura"; navegação e prévias funcionam.

### Banco (resumo)
- `sites_resumo()` (dono): lista com situação, números e avisos; `site_atividade(p_site, p_dias)`: eventos do site com quem fez.
- Último acesso ao portal por pessoa (`client_members.last_seen_at`, gravado pelo portal ao abrir).
- Projeto lançado → `sites.no_ar = true` do site do cliente (gatilho).

## Casos de borda
- Cliente com dois sites: dois cartões; "Ver como o cliente" abre o portal já no site escolhido.
- Site sem cliente (o nosso): sem "Ver como o cliente" nem "Quem usa o painel".
- Cliente sem ninguém no portal: "Ver como o cliente" funciona (mostra o portal que ele verá) e avisa "Ninguém da empresa entrou ainda".
- Tentativa de gravar no espelho por chamada direta: o banco recusa (testes pgTAP).

## Critérios de aceite
- [ ] Dono de outra agência não abre o espelho nem lê `sites_resumo` de outro tenant (pgTAP).
- [ ] No espelho, `portal_aprovar`, `portal_contato_respondido` e `portal_pedido_criar` recusam o dono (pgTAP).
- [ ] Espelho como equipe não mostra Pagamentos nem valores.
- [ ] Lançar o projeto marca o site como no ar.
- [ ] Build, lint, testes e conferência no computador e no celular.

## Métrica
Saber em 10 segundos quais clientes precisam de ajuda com o site; contatos sem resposta há mais de 2 dias perto de zero.
