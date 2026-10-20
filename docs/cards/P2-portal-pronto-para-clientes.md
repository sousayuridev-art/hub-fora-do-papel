# Card P2 · Portal pronto para clientes (20/10)

> **Pedido do Yuri em 20/10:** fechar o que falta para abrir o portal a clientes de verdade.
> **Base:** card P (portal no celular), itens "Antes de publicar para clientes" e critérios de aceite gerais, ainda abertos; card S3 (notas da implementação).
> **Status:** para implementar.

**Objetivo:** o primeiro cliente entra pelo convite, aprova, pede ajuste e paga pelo celular sem travar em nada, e consegue fixar o portal na tela inicial.

**Não entra:** troca de empresa ou de projeto no portal (registrado no S3 como "ficou para depois"; só vira card quando um cliente tiver dois projetos); mudanças de visual das telas.

---

## 1. Ícone na tela inicial (M16)
- `public/site.webmanifest`: `name` "Fora do Papel · Portal", `short_name` "Portal", `start_url` `/portal`, `scope` `/`, `display` `standalone`, `background_color` e `theme_color` `#F5F5F2`.
- Ícones gerados do símbolo oficial (dois quadrados): `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` (símbolo dentro da área segura de 80%) e `apple-touch-icon.png` (180 × 180, fundo `#F5F5F2`).
- `src/routes/__root.tsx`: `<link rel="manifest">`, `apple-touch-icon` e `<meta name="theme-color" content="#F5F5F2">`.
- **Aceite:** no Chrome do Android, "Adicionar à tela inicial" mostra o símbolo e abre direto no `/portal`; no Safari do iPhone, o ícone aparece com fundo claro, sem bordas pretas.

## 2. Carregamento sem saltos (M15 e M17)
- Conferir os esqueletos que já existem em Início, Aprovações, Pedidos, Pagamentos e Arquivos: mesma altura dos cartões carregados.
- Nenhum `backdrop-filter` / `backdrop-blur` em `PortalLayout`, `PortalTabs` e `ActionBar` (o blur existe só no cabeçalho do Hub, no `OperatorLayout`, que fica como está).
- `active:` em botões e abas do portal (já existe nas abas; conferir botões de decisão).
- **Aceite:** Lighthouse no celular com CLS abaixo de 0,1 no Início; nada pula entre o esqueleto e o conteúdo.

## 3. Teste ponta a ponta com um cliente de teste
Feito no ambiente local primeiro (Supabase CLI, `supabase db reset`) e depois em produção com um cliente de teste apagado no fim.

| # | Passo | Resultado esperado |
|---|---|---|
| 1 | Criar o cliente "Cliente teste" no Funil e mandar uma proposta | Link da proposta abre no celular, sem login |
| 2 | Aceitar a proposta pelo celular | Projeto criado com fases e checklist; evento no `event_outbox` |
| 3 | Convidar o contato do cliente para o portal | Chega o link de acesso (e-mail e/ou WhatsApp) |
| 4 | Entrar pelo link no celular | Abre o Início com "Precisam de você" correto |
| 5 | Aprovar uma entrega em Aprovações | Selo e contador caem juntos; a fase avança no Hub |
| 6 | Pedir um ajuste | Pedido aparece no Hub em Pedidos de ajuste |
| 7 | Aprovar um serviço adicional | Valor igual ao do Hub; pedido vai para "Fazendo" |
| 8 | Pagar com Pix e abrir o recibo | Cobrança baixada no Financeiro; recibo abre no celular |
| 9 | Enviar um arquivo obrigatório | Selo de Arquivos cai; arquivo aparece em Materiais |
| 10 | Tirar o acesso do contato | Convites abertos cancelados; o link deixa de entrar |

- **Aceite:** os 10 passos passam no celular do Yuri (iPhone ou Android) e num segundo aparelho de outro sistema; nenhuma tela com rolagem lateral a 390 px.
- Depois do teste em produção: apagar o "Cliente teste" e tudo ligado a ele por RPC/migração de limpeza, nunca pelo painel.

## 4. Aparelhos reais e Lighthouse
- Safari do iPhone e Chrome do Android: área segura, teclado aberto no aceite (barra some), barra do navegador.
- Lighthouse no celular: desempenho 90 ou mais e acessibilidade 100 no Início e na Proposta.
- Marcar os critérios de aceite gerais do card P.

## 5. Configuração de produção
- Supabase › Authentication › Sign In / Providers: "Allow new users to sign up" ligado (necessário para o login por link do convidado).
- URL do site e URLs de redirecionamento do login apontando para o endereço publicado do Hub.
- **Aceite:** um convidado novo entra pelo link na primeira tentativa.

## Critérios de aceite
- [ ] Itens 1 a 5 conferidos, com capturas do celular anexadas ao card.
- [ ] `bun run build`, `bun run lint`, `bun run test` (vitest) e `supabase test db` passam.
- [ ] Nada de chave ou token no frontend nem em logs.
- [ ] Card P com os critérios gerais marcados.
