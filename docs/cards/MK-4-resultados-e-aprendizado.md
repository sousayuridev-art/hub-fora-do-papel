# Card MK-4 · Resultados e aprendizado

> **Origem:** PRD `docs/cards/MK-0-central-de-marketing-prd.md`, entrega MK-4 (29/10/2026). Pedido do Yuri: "Sim!" (escrever o card depois do MK-3 no ar).
> **Depende de:** MK-1 a MK-3 no ar. Os números continuam entrando à mão em "Registrar resultados" (MK-1); a coleta automática é do MK-5.
> **Decisões que valem:** agregação no banco, nunca no navegador (CLAUDE.md); nada de número inventado.

**Objetivo:** mostrar qual conteúdo traz resultado — por pilar, canal, objetivo, formato e campanha — e ligar cada contato do funil à peça que o trouxe, para decidir o que produzir no mês seguinte com base em fato, não em impressão.

## Problema

Hoje a Central registra alcance, salvamentos, cliques e mensagens por versão, mas não junta nada: não dá para ver se "Escolha honesta" rende mais que "Bastidores", se o LinkedIn traz mais conversas que o Instagram, nem quais peças viraram contato no funil. Sem isso o calendário é montado no achismo, e o tempo de produção (o recurso mais caro da agência) vai para o que não converte.

## Objetivos (medíveis)

1. Em até 1 minuto na aba Resultados, o Yuri sabe qual pilar e qual canal trouxeram mais contatos no período.
2. Todo contato que chega pelo site com link de peça fica ligado à peça sem digitação.
3. Peças publicadas há mais de 7 dias sem resultado registrado aparecem numa lista "Falta registrar", para a base não ficar vazia.

**Não entra:**

- coleta automática dos números nas redes (MK-5);
- atribuição por vários toques (a pessoa viu três peças antes de chamar): vale a primeira peça registrada no contato, por simplicidade;
- custo de anúncio e retorno sobre investimento (já ficam em Tráfego pago, card S5);
- IA que aprende com os resultados (fica para depois, com dados de pelo menos 3 meses);
- relatório para cliente no portal.

## Histórias

- Como Yuri, quero ver os resultados do mês agrupados por pilar, para decidir quanto de cada pilar entra no próximo calendário.
- Como Yuri, quero copiar o link com rastreio de cada versão (bio, Stories, LinkedIn), para que o contato que vier pelo site já chegue com a peça de origem.
- Como Yuri, quando um contato chega pelo direct ou pelo WhatsApp dizendo "vi o post de…", quero marcar na ficha qual peça o trouxe.
- Como Yuri, quero ver na própria peça quantos contatos e negócios ela trouxe.

## Requisitos

### P0 · Banco (`supabase/migrations/[data]_mk4_resultados.sql`)

- **Código de rastreio por versão:** `mkt_versions.codigo` (6 letras e números, único por tenant, gerado na criação e para as versões que já existem). Não muda depois.
- **Link com rastreio:** `mkt_versao_link(p_id)` monta o endereço do site com `utm_source` (canal), `utm_medium=social`, `utm_campaign` (nome curto da campanha, se houver) e `utm_content` (código da versão). Endereço base do site em configuração do tenant (hoje `https://foradopapel.com.br`).
- **Peça de origem no cliente:** `clients.mkt_version_id` (referência a `mkt_versions`, `on delete set null`).
  - Automático: quando o contato do site vira negócio (`_site_contato_para_funil`), se `origem ->> 'utm_content'` bate com o código de uma versão **do mesmo tenant**, a ficha recebe essa versão. Código desconhecido ou de outro tenant é ignorado.
  - Manual: campo `peca_origem` na edição da ficha (RPC de edição do cliente que já existe), só aceita versão publicada do mesmo tenant. Valor manual não é trocado pelo automático.
- **Resultados (`mkt_resultados(p_inicio, p_fim, p_agrupar)`):** `p_agrupar` em `pilar | canal | objetivo | formato | campanha`. Por grupo:
  - versões publicadas no período e quantas têm resultado registrado;
  - soma de alcance, salvamentos, cliques e mensagens (só das versões com resultado);
  - salvamentos por mil de alcance (nulo quando o alcance é zero);
  - contatos ligados (clientes com peça de origem no grupo, criados no período), negócios fechados e valor fechado em centavos.
  - Período no fuso do tenant, pela data da publicação da versão. Linha "Sem pilar" ou "Sem campanha" para o que não tem.
- **Destaques (`mkt_resultados_destaques(p_inicio, p_fim)`):** as 5 peças com mais contatos e as 5 com mais salvamentos por mil (mínimo de alcance: 100, para uma peça com 3 visualizações não liderar); lista "Falta registrar" (versões publicadas há mais de 7 dias sem resultado).
- **Na peça:** `mkt_peca_detalhe` passa a trazer, por versão, `codigo`, `link` e `contatos` (quantos clientes têm essa versão como origem) e, na peça, o total de negócios fechados.
- RLS e isolamento como no MK-1: tudo pelo `_tenant_do_dono()`; nenhuma conta no navegador.
- **Testes pgTAP:** `supabase/tests/mk4_resultados.test.sql`.

### P0 · Telas

- **Central de conteúdo › nova aba "Resultados"** (ao lado de Produção, Calendário e Campanhas):
  - período: "Últimos 30 dias" (padrão), "Últimos 90 dias", mês escolhido; agrupar por: Pilar (padrão), Canal, Objetivo, Formato, Campanha. Filtros na URL, como na aba Produção.
  - faixa de números (`FaixaNumeros`): versões publicadas, alcance, salvamentos, contatos, negócios fechados.
  - tabela por grupo, ordenada por contatos; no celular vira cartões.
  - "Melhores peças" (contatos e salvamentos por mil) abrindo o painel da peça.
  - "Falta registrar": lista com botão que abre a peça na aba Versões.
  - Estados: carregando, vazio ("Nenhuma versão publicada nesse período"), erro com "Tentar de novo".
  - Aviso fixo e curto: "Números registrados à mão. Contato conta na peça marcada como origem."
- **Peça › Versões › Agenda e publicação:** "Link com rastreio" com botão "Copiar" (toast "Link copiado") e, depois de publicada, "Contatos desta versão: N".
- **Ficha do cliente:** campo "Peça de origem" (escolha entre peças publicadas, com busca), visível para todas as origens; quando veio automático, mostra "veio pelo link da peça".

### P1

- Exportar a tabela de resultados em CSV.
- No Painel, um cartão "Conteúdo do mês" com contatos vindos de peças.

### P2 (não fechar a porta)

- Colunas de resultado novas (visualizações de vídeo, compartilhamentos) quando o MK-5 trouxer números automáticos: a função de resultados soma as chaves que existirem.

### Site (repositório `fora-do-papel-blueprint`)

Já resolvido pelo card SITE-21 (29/10): o site guarda na sessão a origem da primeira página com campanha e manda no envio do formulário (`origem ->> 'utm_content'`). Conferir que o SITE-21 está publicado no Lovable antes de contar com a ligação automática.

## Casos de borda

- Versão apagada: o cliente perde a peça de origem (fica "não informado"), e os números saem dos totais.
- Mesma pessoa chega duas vezes: vale a origem do primeiro negócio; não sobrescreve.
- Código de rastreio de outro tenant ou inventado: ignorado, sem erro para o visitante.
- Período sem nada: tabela vazia com mensagem, sem divisão por zero.
- Peça com várias versões em canais diferentes: cada versão conta no seu canal; no agrupamento por pilar, todas somam na mesma linha.
- Resultado registrado e depois corrigido: os totais acompanham (calculados na hora, sem cópia).
- Dono de outro tenant: não vê resultados, códigos nem ligações.

## Critérios de aceite

- [ ] Dadas 3 versões publicadas em pilares diferentes com resultados registrados, quando abro Resultados agrupado por pilar, então vejo uma linha por pilar com as somas certas e salvamentos por mil calculados no banco.
- [ ] Dado um contato do site com `utm_content` igual ao código de uma versão, quando ele vira negócio, então a ficha do cliente mostra essa peça como origem e a peça mostra "Contatos desta versão: 1".
- [ ] Um `utm_content` de versão de outro tenant não liga nada.
- [ ] Marcar a peça de origem à mão na ficha funciona e não é trocada depois pelo automático.
- [ ] Versão publicada há 8 dias sem resultado aparece em "Falta registrar"; depois de registrar, sai.
- [ ] Alcance zero não quebra a conta (salvamentos por mil fica vazio).
- [ ] Dono de outro tenant não lê `mkt_resultados`, os destaques nem a peça de origem.
- [ ] "Copiar" põe o link com os quatro `utm_*` na área de transferência.
- [ ] Aba Resultados funciona a 390 px sem rolagem lateral; alvos com 44 px.
- [ ] `supabase test db`, `bun run build`, `bun run lint` e `bun run test` passam.

## Métrica de sucesso

- Rápida: em 2 semanas, mais da metade das versões publicadas tem resultado registrado (a lista "Falta registrar" ajuda).
- Depois: em 2 meses, pelo menos um ajuste de calendário decidido pela aba Resultados (registrado na nota da campanha).

## Decisões (Yuri, 29/10: "Tome as melhores decisões e continue")

1. **Contatos** conta todo cliente novo com peça de origem; "negócios fechados" fica em coluna separada.
2. **Site:** a origem da primeira página da visita já está no SITE-21; nada novo no site.

## Para o Yuri depois de publicar

- Trocar o link da bio e dos Stories pelo "Link com rastreio" das peças em destaque.
- Registrar os resultados das peças em "Falta registrar" uma vez por semana (sugestão: segunda-feira).
