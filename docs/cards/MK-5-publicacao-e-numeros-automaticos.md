# Card MK-5 · Publicação e números automáticos

> **Origem:** PRD `docs/cards/MK-0-central-de-marketing-prd.md`, entrega MK-5, seção 7 (integrações). Pesquisa de 29/10/2026 (Upload-Post, Zernio, Ayrshare, Buffer e acesso direto).
> **Decisão (Yuri, 29/10: "Tome a melhor decisão"):** publicar pelo **Upload-Post** (plano Basic, US$ 24/mês, até 5 contas), ligado pelo **n8n**, com os números guardados no banco do Hub. Em paralelo e sem pressa, pedir o acesso direto da Meta (Instagram) e do YouTube; LinkedIn e TikTok ficam com o Upload-Post até o volume justificar as auditorias.
> **Por que não o Claude Max:** o Max paga o uso do Claude (o Claude Code e, pelos créditos de API, as sugestões da IA do MK-3). Publicar numa rede exige a permissão da própria rede (Meta, LinkedIn, TikTok, Google); nenhum plano do Claude faz isso. O Max continua pagando a IA da Central.
> **Depende de:** MK-1 a MK-4 e MK-6 no ar.

**Objetivo:** a versão aprovada e agendada sai sozinha na hora marcada, o link do post volta para o Hub e, uma vez por dia, os números (alcance, salvamentos, cliques, mensagens/comentários) entram na versão sem digitação. A pessoa continua decidindo: só publica o que foi aprovado e marcado para publicar sozinho.

## Problema

Hoje, depois de aprovar e agendar, alguém precisa abrir cada rede, subir as imagens, colar o texto, voltar ao Hub, colar o link e, uma semana depois, copiar os números à mão. São quatro redes, e o "Falta registrar" do MK-4 mostra o que fica para trás.

## Não entra

- responder comentários e mensagens;
- anúncios pagos (Tráfego pago, S5);
- publicar sem aprovação ou sem a marcação "Publicar sozinho";
- acesso direto às APIs das redes (fica para um card próprio quando a Meta e o YouTube liberarem);
- contas de clientes (P2: um perfil do Upload-Post por cliente).

## Requisitos

### P0 · Banco (`supabase/migrations/[data]_mk5_publicacao.sql`)

- `mkt_versions` ganha:
  - `publicar_sozinho boolean default false`: marcado pela pessoa, só em versão de peça aprovada e com data;
  - `publicacao` (`manual | na_fila | enviada | publicada | falhou`) com `publicacao_erro`, `id_externo` e `publicacao_em`;
  - `resultados_fonte` (`manual | automatico`) e `resultados_em`.
- `mkt_versao_publicar_sozinho(p_id, p_ligar)`: dono; exige peça aprovada, data marcada, arquivos exigidos (MK-2) e canal ligado. Ao ligar, grava o evento `marketing.publicar` em `event_outbox` com tudo o que o n8n precisa: canal, formato, texto, hashtags, link com rastreio (MK-4), caminhos dos arquivos na ordem e data. Desligar antes do envio tira da fila.
- Mudar texto, arquivos ou data de uma versão na fila: desliga o "Publicar sozinho" e avisa (a pessoa liga de novo), para nunca sair uma versão diferente da aprovada.
- RPCs só para a chave de serviço (o n8n):
  - `mkt_publicacao_registrar(p_versao, p_situacao, p_link, p_id_externo, p_erro)`: `enviada`, `publicada` (marca a versão como publicada, como o "Marcar como publicada" do MK-1, e dispara `marketing.versao_publicada`) ou `falhou` (com o motivo);
  - `mkt_resultados_automaticos(p_versao, p_numeros)`: grava os números com fonte `automatico`; não sobrescreve números digitados à mão nas últimas 24 h;
  - `mkt_versoes_para_medir()`: versões publicadas há até 30 dias com `id_externo`, para o n8n buscar os números.
- `mkt_arquivos_assinados(p_versao)` (chave de serviço): links temporários (1 hora) dos arquivos da versão, para o Upload-Post baixar. O arquivo nunca fica público.
- Testes pgTAP `supabase/tests/mk5_publicacao.test.sql`: regras de ligar, desligar ao editar, só serviço registra, isolamento por tenant, números automáticos x manuais.

### P0 · n8n (`docs/n8n/marketing-publicar.json` e `docs/integracoes-n8n.md`)

- **Fluxo "Publicar":** lê `marketing.publicar` da fila (`outbox_reservar`); na hora marcada, pede os links dos arquivos, chama o Upload-Post (foto, carrossel, vídeo, documento ou texto, conforme o formato) com o perfil da Fora do Papel e registra `enviada`; quando o Upload-Post confirma, registra `publicada` com o link; erro vira `falhou` com o motivo. O `id` do evento evita postar duas vezes.
- **Fluxo "Números":** uma vez por dia, `mkt_versoes_para_medir` → números de cada post no Upload-Post → `mkt_resultados_automaticos`.
- Chaves (Upload-Post e service role do Supabase) só nas credenciais do n8n; nunca no Hub, no repositório ou em log.
- Antes de escrever os nós, conferir na especificação do Upload-Post (`docs.upload-post.com/openapi.json`) os nomes exatos dos campos de carrossel, Stories, documento do LinkedIn e carrossel de fotos do TikTok.

### P0 · Telas

- **Versão › Agenda e publicação:**
  - chave "Publicar sozinho na data marcada" (só depois de aprovada e agendada), com o que falta quando não dá ("falta a data", "falta o arquivo");
  - situação: "Na fila para 30/10, 9h", "Enviada", "Publicada · Abrir o post", "Não saiu: [motivo] · Tentar de novo";
  - aviso quando uma edição tirou a versão da fila.
- **Resultados (MK-4):** números automáticos aparecem com "atualizado pela rede em [data]"; o "Falta registrar" deixa de listar versões medidas automaticamente.
- **Painel:** "Não saiu" de publicação entra na fila do que precisa do Yuri.

### P1

- Configurações › Redes: ver quais contas estão ligadas no Upload-Post.
- Acesso direto da Meta e do YouTube (card próprio quando aprovado).

### P2

- Um perfil do Upload-Post por cliente, para publicar nas redes dos clientes.

## Casos de borda

- Data no passado ao ligar: recusa ("escolha uma data a partir de agora").
- Upload-Post fora do ar ou rede recusa (formato, tamanho, limite de 15 posts/dia no TikTok): `falhou` com o motivo, a versão volta para publicar à mão, e o Painel avisa.
- O evento chega duas vezes: o `id` do evento impede o post duplicado.
- Arquivo apagado de Materiais entre a aprovação e a publicação: `falhou` ("arquivo na lixeira").
- Conta da rede desconectada no Upload-Post: `falhou` com "reconectar a conta".
- Número automático menor que o digitado à mão: vale o mais recente, e a tela mostra a fonte.

## Critérios de aceite

- [ ] Versão aprovada, com data, arquivos e "Publicar sozinho" ligado gera um `marketing.publicar` na fila com texto, link com rastreio e arquivos na ordem.
- [ ] Editar o texto de uma versão na fila desliga o "Publicar sozinho" e avisa.
- [ ] `mkt_publicacao_registrar` com `publicada` marca a versão como publicada com o link; só a chave de serviço consegue chamar.
- [ ] `mkt_resultados_automaticos` grava os números com fonte automática e aparece em Resultados.
- [ ] Dono de outro tenant não liga, não vê nem registra nada nas versões de outro.
- [ ] Fluxo do n8n importável no repositório, sem chave dentro.
- [ ] `supabase test db`, `bun run build`, `bun run lint` e `bun run test` passam.

## Para o Yuri

**Antes de implementar:** nada; o Hub e o fluxo do n8n são feitos e testados sem a conta.

**Para ligar de verdade (depois do merge):**
1. Assinar o Upload-Post (plano Basic) e criar o perfil "fora-do-papel".
2. Conectar Instagram (conta profissional), página do LinkedIn, TikTok e YouTube pelo link do Upload-Post.
3. Guardar a chave do Upload-Post nas credenciais do n8n (não passa pelo chat) e importar os dois fluxos.
4. Testar com uma peça só ("Publicar sozinho" numa versão de teste) antes de ligar nas outras.
5. Na política de privacidade e nos contratos: as publicações passam pelo Upload-Post, fornecedor nos EUA (LGPD).
