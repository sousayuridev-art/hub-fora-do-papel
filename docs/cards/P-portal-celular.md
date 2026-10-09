# Card P · Portal do cliente no celular

**Objetivo:** o cliente decide e aprova pelo celular sem rolar à procura do botão. Protótipo validado em 09/10 (canvas, quadro "Portal · No celular").
**Regra de ouro:** tudo vale só até 767 px. Acima disso o portal fica exatamente como no protótipo de computador.
**Como entra no código:** a estrutura (itens 1 a 3) entra junto com o `PortalLayout` da Sprint 0. Os ajustes de cada tela (itens 4 a 10) entram no card de cada tela do portal, quando ela for construída. Os itens 11 a 14 entram antes de publicar o portal para clientes.
**Métrica:** taxa de aceite de proposta e tempo entre envio e aprovação, separados por celular e computador.

---

## Estrutura (Sprint 0, no `PortalLayout`)

| Código | O que fazer | Aceite |
|---|---|---|
| M1 | `PortalHeader` com 56 px, fixo no topo: logo, nome da empresa do cliente (corta com reticências) e avatar. O menu de cima some no celular. | A 390 px, o cabeçalho mede 56 px e o conteúdo começa logo abaixo. |
| M1 | `PortalTabs` fixa embaixo: Início, Aprovações, Pedidos, Pagamentos, Arquivos. Ícone (lucide) + nome com 12,5 px, aba atual com fundo `#F1F1EC` atrás do ícone. Altura de 64 px + `env(safe-area-inset-bottom)`. | Navega entre as 5 telas; nada fica escondido atrás da barra. |
| M11 | Selos: Aprovações = itens aguardando aprovação; Arquivos = itens obrigatórios ainda não enviados. A soma é o contador "Precisam de você" do Início. Os números vêm de uma única RPC (`portal_pending_counts`), nunca contados no frontend. | Aprovar um item reduz o selo e o contador ao mesmo tempo. |
| M2 | `ActionBar` (mesma posição da barra de abas): valor à esquerda, botão principal à direita. Quando a tela usa `ActionBar`, `PortalTabs` não aparece. | Na Proposta, o botão leva ao bloco de aceite (rolagem suave), sem aceitar direto. |
| M13 | Altura mínima com `100dvh`, `viewport-fit=cover` na meta viewport e `scroll-margin-top: 72px` nos alvos de âncora. | Nada fica atrás da barra do navegador nem do recorte do iPhone. |
| — | Barras fixas somem com o teclado aberto (foco em campo de texto). | Ao digitar no aceite, a barra de baixo não cobre o campo. |

## Ajustes por tela (no card de cada tela)

| Código | Tela | O que fazer |
|---|---|---|
| M3 | Início | Bloco escuro de status com os 3 números numa fileira (números com 20 px). "Precisa da sua ação" na primeira tela (cerca de 530 px a 390 px de largura). |
| M8 | Início | Fases como lista vertical: marcador, nome e data à esquerda, situação à direita; fase atual com fundo `#FFF8EA`. |
| M7 | Proposta | Resumo no topo (criação, mensalidade, prazo, validade e versão) com link para "Investimento". "Não está incluído" e "Como vamos trabalhar" começam recolhidos, com botão "Ver os 4 itens…" / "Ocultar". No computador ficam sempre abertos. |
| M2 | Proposta | `ActionBar`: "R$ 7.200 + R$ 290/mês" e "Aceitar proposta". Depois do aceite: "Aceita em dd/mm" e "Abrir meu portal". |
| M2/M12 | Serviço adicional | `ActionBar`: valor e "Aprovar". "Voltar" (seta) no cabeçalho, para Aprovações; o link de voltar do conteúdo some no celular. |
| M12 | Avaliação | "Voltar" no cabeçalho, para o Início. Proposta e Diagnóstico não têm "Voltar" (são abertos antes de o cliente ter portal). |
| M9 | Aprovações | Prévia com 120 px de altura; "Abrir prévia completa" continua embaixo. |
| M10 | Pagamentos | Cada parcela em grade de 2 colunas: nome e data à esquerda, valor à direita; situação e "Recibo" na linha de baixo. |

## Regras gerais (valem para todas as telas do portal)

| Código | O que fazer |
|---|---|
| M4 | h1 com 28 px, h2 com 20 px, números de destaque com 36 px no máximo; nenhum texto abaixo de 12,5 px. Margens laterais de 16 px; cartões com 20 px de espaço interno. |
| M5 | Campos com 16 px. CPF/CNPJ com `inputMode="numeric"`, WhatsApp com `type="tel"`, e-mail com `type="email"`, e `autoComplete` certo (name, organization, street-address, email). Envio de arquivo com `accept="image/*,application/pdf"` para oferecer a câmera. |
| M6 | Botões principais em largura total. Grupos de decisão (Aprovar / Pedir ajuste / Não quero agora) empilhados, com a mesma largura e 48 px de altura, o principal em cima. |

## Antes de publicar para clientes (os "Depois" da revisão)

| Código | O que fazer |
|---|---|
| M14 | Fontes só com o subconjunto latino e `display=swap` (ou `@fontsource` local). |
| M15 | Esqueletos de carregamento com a mesma altura dos cartões (sem saltos de layout); nada de `backdrop-filter` nas barras fixas. |
| M16 | Manifesto e ícones para "Adicionar à tela inicial", abrindo em `/portal`. |
| M17 | Retorno ao toque: `active:` em botões e abas; sem destaque azul padrão (`-webkit-tap-highlight-color: transparent`). |

## Critérios de aceite gerais

- [ ] A 390 px não há rolagem lateral em nenhuma tela do portal.
- [ ] A 1440 px, cada tela fica igual ao protótipo de computador (comparar capturas).
- [ ] Testado no Safari do iPhone e no Chrome do Android: área segura, teclado e barra do navegador.
- [ ] Lighthouse no celular: desempenho 90 ou mais e acessibilidade 100 no Início e na Proposta.
