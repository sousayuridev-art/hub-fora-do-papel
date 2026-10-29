# MK-0 · Central de marketing (PRD e proposta)

> **Origem:** pedido do Yuri em 29/10/2026 ("transformar a seção de criativos no centro de criação e inteligência de marketing da Fora do Papel").
> **Decisões do Yuri (29/10):** módulo novo no Hub, em `/app`, ligado aos outros módulos; primeiro para a própria Fora do Papel, pronto para atender clientes depois; entrega em proposta + card + primeira fatia de código.
> **Fontes de regra:** skills `voz-fora-do-papel` e `conteudo-redes-fora-do-papel` (pilares, chamadas, TUDO, regras por canal). Em conflito, vale o manual de comunicação.

## 1. O que existe hoje (análise de 29/10)

- **Não existe tela de criativos** em nenhum repositório (Hub, site, CRM) nem no Lovable. O card S8 deixou "criativos em Materiais" de fora.
- **Peças já produzidas fora do Hub:** 9 posts, 4 Reels (entre eles o "um lugar só" em 3D), bio, destaques e o manual de marca. Estão em arquivos e documentos do Claude, sem situação, data, objetivo nem resultado.
- **O que o Hub já tem e a central reaproveita:**
  - Materiais (S8): arquivos no Storage privado, textos prontos e links.
  - Tráfego pago (S5/RD-6): campanhas de anúncio (`ad_campaigns`), gastos e funil.
  - Clientes e Projetos: base para a série "Projetos reais".
  - `event_outbox` para o n8n, RLS por `tenant_id`, sessão forte do dono (SEG-1).
  - Regras de IA (`docs/regras-ia.md`): `ai_usage`, teto mensal, Haiku/Sonnet, "IA sugere, pessoa decide".
  - Componentes `Quadro`/`ColunaQuadro`, painel lateral, filtros na URL e atualização otimista da Central de Tarefas.
- **Não existe ligação com nenhuma rede.** Publicar, agendar na rede e ler métricas são funções futuras (seção 7).

## 2. Problema

O marketing da Fora do Papel acontece em conversas soltas: a ideia nasce num chat, a peça vira um arquivo, a legenda fica num documento e o resultado não volta para lugar nenhum. Não dá para ver o que está em produção, o que precisa de aprovação e o que já saiu, nem saber qual pilar trouxe conversa. Cada rede recebe o mesmo texto ou nenhum, e as regras da marca (TUDO uma vez, uma chamada só, nada de marcador) dependem de memória.

## 3. Objetivos

1. Toda peça tem dono, objetivo, etapa do funil, pilar e situação visíveis num lugar só.
2. Uma ideia vira versões próprias para cada canal (Instagram, LinkedIn, TikTok, YouTube), sem copiar e colar o mesmo texto.
3. Nenhuma peça chega à aprovação com marcador, chamada fora do manual ou regra da marca quebrada.
4. Depois de publicar, o resultado volta para a peça e mostra quais pilares trazem conversa.

## 4. Não-objetivos (por agora)

- Editor de imagem ou de vídeo dentro do Hub. A direção de arte é registrada e a peça final vem de arquivo (Materiais) ou de ferramenta externa (Canva, Figma, CapCut).
- Publicar direto na rede sem integração aprovada pela plataforma (seção 7).
- Gerar imagem por IA. A direção é "IA aliada, não substituta do bom design": a IA sugere texto e roteiro; imagem é feita por pessoa ou a partir de modelos da marca.
- Atender clientes pelo portal. A arquitetura já separa por `tenant_id`, mas a oferta para clientes é outro card.

## 5. Como a central pensa (o "cérebro de agência")

A inteligência começa por regras explícitas no banco, que funcionam sem IA e não custam nada. A IA entra depois, por cima dessas regras.

- **Toda peça nasce de um briefing:** objetivo (alcance, autoridade, conversa, venda), etapa do funil (descoberta, consideração, decisão), pilar (os 6 da skill de conteúdo), frente (sistemas, IA, sites e lojas, automações, diagnóstico), público e a ideia central em uma frase. Sem briefing completo, a peça não sai da etapa de briefing.
- **Uma ideia, várias versões:** a peça é a ideia; cada canal ganha a sua versão, com formato, gancho, texto, roteiro (Tempo · Fala · Na tela) ou slides e chamada próprios.
- **Revisão automática da marca em cada texto:**
  - marcador (`[PREÇO]`, `[NOME]`…) bloqueia a aprovação;
  - TUDO mais de uma vez, mais de uma exclamação e termos evitados (lead, call, deploy, pipeline, kickoff, onboarding…) viram aviso;
  - chamada só da lista do manual.
- **Projeto real exige autorização:** peça ligada a cliente só vai para aprovação com a autorização marcada.
- **Calendário que questiona:** avisa quando o mesmo canal recebe dois posts seguidos do mesmo pilar e quando a chamada direta passa de 1 a cada 5 posts.
- **Aprovação registrada:** aprovar e pedir ajuste ficam no histórico, com nota. Pedido de ajuste volta a peça para refinamento.

## 6. Fluxo de produção (9 etapas, 5 colunas)

| Coluna       | Etapas                                            | Sai quando                                   |
| ------------ | ------------------------------------------------- | -------------------------------------------- |
| Planejamento | Ideia, Briefing                                   | briefing completo e pelo menos uma versão    |
| Criação      | Conceito (direção de arte), Produção, Refinamento | cada versão tem texto e nenhuma tem marcador |
| Aprovação    | Aprovação (com prévia por canal)                  | aprovada ou com pedido de ajuste             |
| Pronto       | Pronto (pode ter data agendada)                   | todas as versões publicadas                  |
| Publicado    | Publicado, Analisado                              | resultados registrados em todas as versões   |

"Agendado" é um dado da versão (data marcada), não uma etapa: sem integração, a publicação é feita pela pessoa e marcada no Hub com o link.

## 7. Integrações: o que existe e o que depende de terceiros

| Canal             | Publicar pela API                                | O que exige                                                                                           | Quando                              |
| ----------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Instagram         | Sim: imagem, carrossel (até 10), Reels e Stories | Conta profissional, app da Meta com permissão de publicação, mídia em endereço público, limite diário | MK-5, via n8n                       |
| LinkedIn (página) | Sim, com a API de gestão de páginas              | Revisão da LinkedIn para empresa registrada; sem ela, só como pessoa                                  | MK-5, depois da revisão             |
| TikTok            | Sim                                              | Sem auditoria do app, os posts ficam privados; auditoria exige app de uso amplo                       | Avaliar; provável publicação manual |
| YouTube           | Sim (Shorts e vídeo longo)                       | Projeto no Google Cloud com cota de envio                                                             | MK-5, via n8n                       |

Atalho a considerar no MK-5: um serviço intermediário de publicação já aprovado nas redes, em vez de passar por quatro revisões. Decisão de custo do Yuri.

## 8. Entregas (cards)

- **MK-1 · Produção e calendário (este ciclo):** banco, quadro de produção, painel da peça com briefing e versões por canal, revisão automática da marca, aprovação, calendário e campanhas.
- **MK-2 · Peças com arquivos e prévia real:** ligar versões a Materiais (imagens, vídeos, PDF do carrossel), prévia com a imagem real, versões da peça.
- **MK-3 · IA que sugere:** gerar versões por canal a partir da ideia, sugerir ganchos e roteiros, revisar texto pela voz. Edge Function, Sonnet para texto que vai a público, `ai_usage` e teto; sempre com revisão humana.
- **MK-4 · Resultados e aprendizado:** painel por pilar, canal e objetivo (visualizações, salvamentos, cliques, mensagens, contatos no funil), ligando contatos do funil à peça de origem.
- **MK-5 · Publicação e métricas automáticas:** eventos `marketing.*` para o n8n publicar e trazer números, canal por canal, conforme a seção 7.
- **MK-6 · Modelos da marca:** biblioteca de modelos de carrossel, capa de Reels e Stories com as cores, fontes e grade da marca, usada pela prévia e pela IA.

## 9. Casos de borda

- Dado de outro tenant: nenhuma tabela é lida sem `is_tenant_owner`; RPCs recusam id de outro tenant.
- Sessão sem código do app: recusada (SEG-1).
- Peça sem versões, versão sem texto, marcador esquecido, link sem `https`, data de publicação no futuro, resultado negativo.
- Remover campanha com peças: as peças ficam, sem campanha.
- Duplo clique em aprovar: a segunda chamada encontra a peça já pronta e é recusada sem duplicar o histórico.
- Sem rede: toda ação desfaz na tela e oferece "Tentar de novo".

## 10. Métricas de sucesso

- **Rápida:** em 2 semanas, 100% das peças publicadas passaram pelo quadro (com briefing e aprovação registrados).
- **Depois:** em 6 semanas, saber quais 2 pilares trazem mais mensagens e contatos, e repetir esses pilares no calendário.

## 11. Perguntas abertas

- Usar serviço intermediário de publicação ou pedir as revisões direto nas redes? (Yuri, bloqueia só o MK-5.)
- A central vira serviço adicional para clientes? Com qual mensalidade? (Yuri, bloqueia só a oferta.)

## Referências consultadas (29/10/2026)

- Fluxos de aprovação em camadas e histórico de versões: Planable ("content approval workflow").
- Medidas do Instagram: inro.social, guia de 2026 (4:5 padrão, 3:4 na grade, 9:16 com área segura).
- Limites de publicação: documentação da Meta (Content Publishing), TikTok (Content Sharing Guidelines), YouTube (videos.insert) e guia de publicação em páginas do LinkedIn (upload-post.com).
