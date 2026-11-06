# Card RS-1 · Revisar o site: banco, rodadas e anexos

> **Origem:**
>
> - Especificação "Módulo de Revisão do Site (Portal do Cliente)", 06/11/2026.
> - Canvas "Portal · Revisar o site": 9 telas de celular e 1 de computador.
>
> **Nome:** a especificação chamava este card de REV-1, mas os cards REV-1 a REV-5 já existem (revisões gerais). A família nova se chama **RS** (Revisar o site).
>
> **Base:** reaproveita `requests` (S3), o contexto e os anexos do PC-2, a conversa do SIS-2 (`request_mensagens`), as aprovações do S3 (`approvals`) e os perfis do CX-0. Nenhuma fila nova no Hub: tudo continua em Entregar › Pedidos de ajuste.

**Objetivo:**

- O cliente marca ajustes no site como rascunho e os envia juntos, numa rodada.
- Cada ajuste vira um pedido de ajuste com o lugar exato e o antes e depois.
- Depois, o cliente confere cada ajuste e o responsável aprova o site.

**Não entra:**

- Telas (cards RS-2 e RS-3).
- Transcrição do áudio.
- Aviso por WhatsApp. O evento é gravado aqui, e o n8n trata depois.

## Decisões de modelagem (diferenças da especificação)

1. **Rascunho fora de `requests`.** Se os marcadores fossem pedidos desde o começo, cada um apareceria no Hub antes do envio. Por isso o rascunho fica numa tabela própria, e o envio cria os pedidos numa transação só.
2. **Rodada em tabela e coluna, não no `jsonb`.** A rodada vira a tabela `site_rodadas`, ligada pela coluna `requests.rodada_id`. Assim dá para filtrar, contar e criar índice, e "a rodada 2" vira uma unidade de entrega.
3. **Origem.** O valor novo `revisao` entra em `request_origin`, no lugar de `painel_revisao` da especificação. No Hub, a origem aparece como "Revisão · rodada N · [página]".
4. **"Mudar agora, eu mesmo".** Não precisa de `has_puck_module`: aparece quando `'paginas' = any(sites.modulos)`, a regra que o PC-1 e o PC-4 já usam.
5. **Âncora do marcador.** O marcador guarda a página, a seção do editor (id do bloco do PC-4) e a posição dentro da seção em porcentagem (0 a 1). Não guarda pixels. Assim o marcador feito no celular cai no mesmo lugar no computador.
6. **Limite de rodadas.** Conforme o fluxo da Fora do Papel, a validação tem até 2 rodadas incluídas.
   - A partir da 3ª rodada, todo ajuste entra já marcado "provável serviço adicional". O Yuri ainda classifica um por um.
   - Depois que o responsável aprova o site, todo ajuste novo é serviço adicional.

## Requisitos

### Banco (`supabase/migrations/[data]_rs1_revisar_site.sql`)

**Origem:** `alter type public.request_origin add value 'revisao'`, numa migração separada, como no PC-2 e no SIS-2.

**`site_rodadas`:**

- Colunas:
  - `id`, `tenant_id`, `site_id`, `client_id`;
  - `numero int` (1, 2, 3…, único por site);
  - `situacao` (`rascunho`, `enviada`, `concluida`);
  - `criada_por`, `enviada_em`, `enviada_por`, `concluida_em`.
- Só existe uma rodada em rascunho por site (índice único parcial).

**`site_marcadores` (o rascunho):**

- Colunas:
  - `id`, `tenant_id`, `rodada_id`, `site_id`, `ordem int`;
  - `tipo`: `texto`, `foto`, `tirar`, `mover`, `incluir` ou `outro`;
  - `pagina_id`, `secao_id`, `posicao jsonb` (`{x, y}` entre 0 e 1);
  - `antes text` (texto atual ou caminho da foto atual), `depois text` (até 2000 caracteres), `observacao` (até 1000 caracteres), `audio_path`;
  - `criado_por`, `criado_em`, `atualizado_em`.
- Até 30 marcadores por rodada.

**`requests` ganha:**

- `rodada_id uuid null` (FK `site_rodadas`) e `marcador_ordem int null`;
- `validado_em`, `validado_por`;
- `refeito_vezes int not null default 0`.

O `contexto jsonb` do PC-2 passa a levar também `tipo`, `secao_id`, `posicao`, `antes`, `depois` e `audio_path`.

**Anexos:**

- Foto nova e print: JPG, PNG ou WebP, até 5 MB; PDF só como anexo.
- Áudio: até 2 minutos e 5 MB, em webm, ogg ou m4a.
- Ficam na pasta da empresa no Storage do PC-2: `{tenant}/{client}/revisao/{rodada}/…`.
- O RPC confere a pasta antes de gravar, como o `_sis_anexo`.

**RLS:**

- Todas as tabelas novas com `tenant_id` e RLS ativa.
- O cliente lê e escreve só pelos RPCs abaixo, todos `security definer`, com a empresa conferida pelo `client_members`.
- O dono lê tudo do tenant.

**RPCs do portal:**

| RPC                                                   | Quem                               | O que faz                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `revisao_rascunho(p_site)`                            | responsável ou equipe              | Devolve a rodada em rascunho (cria se não houver) com os marcadores.                                                                                                                                                                                                                                                                                             |
| `revisao_marcador_salvar(p_rodada, p_marcador jsonb)` | responsável ou equipe              | Cria ou atualiza o marcador. Valida o tipo, a página do site, a posição e os tamanhos.                                                                                                                                                                                                                                                                           |
| `revisao_marcador_apagar(p_marcador)`                 | quem criou ou o responsável        | Remove o marcador do rascunho.                                                                                                                                                                                                                                                                                                                                   |
| `revisao_enviar(p_rodada)`                            | responsável ou equipe              | Numa transação: cria um pedido por marcador (origem `revisao`, situação `recebido`, `rodada_id`, contexto e anexos), marca a rodada como `enviada` e grava **um** evento `revisao.rodada_enviada` (com N ajustes) no `event_outbox`. Rodada vazia é recusada (`rodada_vazia`), e rodada já enviada também (`rodada_enviada`). Trava a rodada contra envio duplo. |
| `revisao_acompanhar(p_site)`                          | responsável ou equipe              | Rodadas e pedidos com a situação para o cliente (tabela abaixo). Para quem é da equipe, sem valor nem horas (regra do CX-0).                                                                                                                                                                                                                                     |
| `revisao_validar(p_pedido)`                           | responsável ou equipe              | Só com o pedido `pronto` e ainda sem validação: grava `validado_em` e `validado_por`.                                                                                                                                                                                                                                                                            |
| `revisao_pedir_outra(p_pedido, p_texto)`              | responsável ou equipe              | Só com o pedido `pronto`: grava a mensagem na conversa (`request_mensagens`), volta o pedido para `fazendo` e soma 1 em `refeito_vezes`. A partir da 3ª vez, recusa com `limite_refacao` e orienta a abrir um pedido novo.                                                                                                                                       |
| `revisao_aprovar_site(p_site, p_confirmacoes)`        | só o responsável com `can_approve` | Exige as três confirmações e nenhum pedido da rodada em aberto. Cria e decide a aprovação "Aprovação final do site" em `approvals`, marca as rodadas como `concluida` e grava o evento `revisao.site_aprovado`. Pessoa da equipe recebe `so_responsavel` (42501).                                                                                                |

**Situação que o cliente vê** (em `revisao_acompanhar`, em frase normal, sem caixa alta):

| `requests.status`                        | Para o cliente                       |
| ---------------------------------------- | ------------------------------------ |
| `recebido`, `em_analise`                 | Enviado                              |
| `fazendo`                                | Em andamento                         |
| `pronto`, sem `validado_em`              | Para você ver                        |
| `pronto`, com `validado_em`              | Aprovado                             |
| `aguardando_cliente` (serviço adicional) | Orçamento para aprovar               |
| `recusado`                               | Não vamos fazer (com a nota do Yuri) |

### Hub

Em `/app/pedidos`:

- O filtro de origem ganha "Revisão".
- O painel do pedido mostra, no bloco "Onde" (PC-2), o tipo, o antes e o depois, o player de áudio e "Rodada N · ajuste M de X".
- O cartão mostra "Revisão · rodada N".

O desenho do lado do Hub fica para o próximo passo da especificação ("Modelagem canvas do Hub"). Aqui entram só os dados no bloco que já existe.

## Casos de borda

- Duas pessoas editando o mesmo rascunho: cada marcador tem dono. Quem não criou só edita a própria observação, e o responsável edita todos. O último a salvar vence, com `atualizado_em` conferido.
- Rodada enviada com um marcador apontando para uma página que foi apagada depois: o pedido guarda o nome da página no contexto e continua legível.
- Site sem a página no editor (sem o módulo `paginas`): o marcador usa `secao_id` nulo e a posição sobre a captura. Ver o modo lista no RS-2.
- Envio duplo (dois toques ou duas abas): a trava da rodada garante que só um envio vale.

## Critérios de aceite

- [ ] Pessoa da equipe cria 3 marcadores e envia: nascem 3 pedidos com origem `revisao` e o mesmo `rodada_id`, e o `event_outbox` recebe um evento só (pgTAP).
- [ ] Marcador com página de outro site ou de outra empresa é recusado (pgTAP).
- [ ] O rascunho não aparece no Hub antes do envio (pgTAP: `requests` sem linhas).
- [ ] `revisao_aprovar_site` chamado por pessoa da equipe é recusado; pelo responsável sem as 3 confirmações também (pgTAP).
- [ ] A 3ª rodada marca os pedidos como "provável serviço adicional" no contexto (pgTAP).
- [ ] `supabase test db`, `bun run build`, `bun run lint` e `bun run test` passam.

## Implementação (06/11/2026)

- **Migrações:**
  - `20261106100000_rs1_origem_revisao.sql` acrescenta a origem `revisao`.
  - `20261106100100_rs1_revisar_site.sql` cria o resto: tabelas `site_rodadas` e `site_marcadores`; colunas novas em `requests` e `sites`; os RPCs `portal_revisao`, `portal_revisao_salvar`, `portal_revisao_tirar`, `portal_revisao_enviar`, `portal_revisao_ficou_bom`, `portal_revisao_outra_mudanca` e `portal_revisao_aprovar`; o selo `site` em `portal_pendencias`; e `v_pedidos` com a revisão.
- **Nomes para o cliente (versão 2 do canvas):** "ajuste" no lugar de marcador e "revisão 1, 2…" no lugar de rodada. No banco, os nomes das tabelas ficaram.
- **Foto e áudio:** são arquivos do cliente em `materials` (S8), com o áudio do navegador aceito (`audio/webm`, `audio/mp4` e `audio/ogg`). No envio, cada arquivo fica ligado ao seu pedido.
- **Aviso:** o envio grava um evento só, `revisao.enviada`. "Quero outra mudança" grava `revisao.outra_mudanca`, e a aprovação grava `revisao.site_aprovado`.
- **Hub:**
  - a origem aparece como "Revisão N · página";
  - o bloco "Onde" mostra a revisão, o tipo, o "Hoje está" e o "Deve ficar", e avisa quando é provável serviço adicional ou quando o ajuste já foi refeito;
  - a conversa com a equipe do cliente vale também para a revisão.
- **Teste:** `supabase/tests/rs1_revisar_site.test.sql` com 34 verificações.
