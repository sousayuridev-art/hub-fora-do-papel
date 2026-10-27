# PC-0 · Painel do cliente dentro do portal · PRD (27/10)

> **Decisões do Yuri (27/10):**
> - O painel em que o cliente atualiza o próprio site e loja vive **dentro do Hub**, como evolução do portal (`/portal`). Mesmo banco, mesmo login, mesmos perfis (CX-0). Nada de banco novo.
> - Todo pedido de ajuste feito pelo cliente no painel aparece no Hub, em **Entregar › Pedidos de ajuste**, como os pedidos do portal de hoje.
> - A estrutura aprovada no protótipo (Lovable "Painel Fora do Papel", 27/10) vale como referência visual e de navegação: menu único por tarefa, edição direto na página, Início com "Precisa da sua atenção", ações rápidas, resumo e saúde do site.
> - O degradê da marca fica no botão principal e no cartão de abertura (escolha do Yuri, 27/10). O design system ainda diz o contrário; atualizar o design system é pendência separada.
> - **Leitura dos sites (Yuri, 27/10, opção A + C):** todo site novo de cliente nasce lendo o banco do Hub como o site da Fora do Papel (CMS-3: busca no servidor, cache curto, reserva estática). Os sites que já estão no ar continuam por pedido de ajuste e migram aos poucos, começando pelo primeiro cliente do teste. Gerar site estático a cada publicação fica registrado como evolução futura.
> - **Conteúdo de sites (Yuri, 27/10):** banco do Hub, não Sanity. A linha do CLAUDE.md foi corrigida.
> **Depende de:** CX-0 (perfis), S3 (pedidos, aprovações, portal), CMS-1 a CMS-4 (conteúdo do site da Fora do Papel), SS-1 (módulos).

## Problema
Hoje o cliente precisa pedir pelo WhatsApp para trocar uma foto, um preço ou um horário no site. Cada pedido simples vira trabalho do Yuri e atraso para o cliente. O portal já organiza aprovações, pedidos e pagamentos, mas não deixa o cliente mexer no próprio site. Os concorrentes (Wix, Nuvemshop) dão autonomia, mas com modelos genéricos; a Fora do Papel entrega site sob medida e hoje não oferece essa autonomia.

## Objetivos
1. O cliente faz sozinho as 5 tarefas do dia a dia (trocar a foto da capa, cadastrar produto, responder contato, publicar artigo, mudar horário) sem pedir ajuda. Meta: 4 de 5 no teste com 3 clientes reais.
2. Pedidos de ajuste simples pelo WhatsApp caem pela metade em 60 dias nos clientes que usam o painel (medido em `requests` por origem).
3. O cliente tem um só lugar e um só login para o site, a loja e a relação com a Fora do Papel.
4. O painel aparece nas propostas como parte da mensalidade e vira motivo de fechamento.

## Não-objetivos
- Banco ou login separados do Hub.
- Editor de layout livre (arrastar e posicionar elementos). O cliente edita campos e adiciona seções aprovadas; o layout é da Fora do Papel (mantém o CMS-0).
- Checkout e pagamento próprios da loja: entram por integração (Mercado Pago ou Stripe) em card próprio, depois do LOJA-0.
- Números de desempenho reais (visitas, origem): dependem da escolha da ferramenta de medição. Até lá, a área mostra "em preparação".
- IA real: a assistente virtual entra em card próprio, seguindo `docs/regras-ia.md`.

## Quem usa
- **Responsável pelo contrato** (CX-0): tudo, inclusive valores, pagamentos, vendas da loja e convites da própria equipe.
- **Equipe do cliente** (CX-0): edita conteúdo, responde contatos, faz pedidos de ajuste. Não vê valores, pagamentos nem faturamento da loja; o banco recusa.
- **Yuri no Hub:** recebe os pedidos de ajuste, define o que cada site pode editar (módulos e travas) e acompanha tudo pela linha do tempo do cliente.

## Histórias
- Como responsável, quero trocar a foto da capa do site e publicar, para não esperar a Fora do Papel.
- Como equipe, quero responder pelo WhatsApp quem pediu orçamento no site e marcar como respondido, para ninguém ficar sem resposta.
- Como responsável, quero pedir à Fora do Papel uma mudança que não consigo fazer, já dizendo em qual página, para não explicar tudo de novo no WhatsApp.
- Como Yuri, quero ver no Hub o pedido do cliente com a página e o print, para classificar (dentro do combinado, mensalidade ou serviço adicional) sem perguntar.
- Como equipe, ao abrir Pagamentos pelo endereço, quero entender que isso fica com o responsável (regra que já existe).
- Erro: se a internet cair no meio da edição, o rascunho digitado não se perde e o aviso explica.
- Vazio: cliente sem site contratado vê só a área Fora do Papel (como o portal de hoje), sem menus vazios.

## Requisitos
### P0
- Navegação do portal reorganizada no menu único por tarefa, montado pelos módulos do site do cliente (PC-1).
- Início novo, somando o "Precisa de você" que já existe com as ações do site (PC-1).
- Pedido de ajuste feito no painel chega ao Hub com a página e o anexo (PC-2).
- Cliente edita artigos e fotos do próprio site, com rascunho e publicação (PC-3).
- Cliente edita as páginas direto na página, com seções aprovadas e travas por site (PC-4).
- Contatos do formulário e do botão de WhatsApp do site numa caixa, com "Responder no WhatsApp" (PC-5).
- Dados do negócio, horário de atendimento e "Aparecer no Google" editáveis (PC-6).
- Isolamento: nenhuma pessoa vê ou altera dados de outra empresa; equipe não vê dinheiro (testes de banco em todos os cards).

### P1
- Responsável convida a própria equipe (hoje só o Yuri convida pelo Hub).
- Histórico de versões com "voltar para a versão anterior" nas páginas.
- Baixar os dados e uma cópia do site ("O site é seu").
- Avisos de novo contato por e-mail (pelo `event_outbox` e n8n).

### P2
- Loja completa (produtos, estoque, vendas, cupons) com pagamento por integração.
- Desempenho com dados reais.
- Assistente virtual (descrição de produto, resumo de artigo, descrição de foto), com revisão humana.
- Relatório mensal enviado ao cliente.

## Casos de borda
- Pessoa com acesso a duas empresas: troca de empresa no topo do menu (hoje o portal mostra a primeira; S3 deixou registrado).
- Cliente com projeto em andamento e site já no ar: o Início mostra os dois blocos (projeto e site).
- Site sem módulo de loja: menu Loja não aparece; acessar `/portal/loja` pelo endereço explica que a loja não está contratada.
- Duas pessoas editando a mesma página: a segunda vê aviso de que a página foi alterada e recarrega antes de publicar.
- Sessão expirada no meio da edição: o rascunho continua salvo; ao entrar de novo, volta para a mesma página.
- Foto acima do limite ou em formato não aceito: recusa antes de enviar, com o motivo.
- Texto no limite máximo de caracteres não quebra o site em 360, 768 e 1280 px.

## Métricas
- Rápida: % das 5 tarefas concluídas sem ajuda no teste com clientes.
- Depois: pedidos de ajuste com origem WhatsApp por cliente, antes e depois do painel (60 dias).

## Ordem
1. CMS-1 a CMS-4 (site da Fora do Papel) — já aprovados; servem de base.
2. PC-1 navegação e Início · PC-2 pedido de ajuste com contexto (podem andar juntos).
3. PC-3 conteúdo do cliente · PC-4 páginas na própria página.
4. PC-5 contatos · PC-6 ajustes do negócio.
   Sites que já estão no ar migram para a leitura do banco um por vez, cada um com card próprio no repositório do site.
5. Teste com 3 clientes reais (loja, clínica, prestador de serviço).

## Perguntas abertas
| Pergunta | Quem responde | Bloqueia? |
| --- | --- | --- |
| O endereço continua `/portal` ou vira um domínio próprio (ex.: painel.foradopapel.com.br)? | Yuri | Não (dá para mudar depois) |
| O responsável pode convidar a própria equipe, ou isso continua só com o Yuri? | Yuri | Não (P1) |
| Qual ferramenta mede visitas dos sites dos clientes? | Yuri | Não (P2) |
