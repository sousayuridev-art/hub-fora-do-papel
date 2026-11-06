# Card RS-3 · Revisar o site: acompanhar, conferir e aprovar o site (telas 07 a 09)

> **Origem:** especificação "Módulo de Revisão do Site", 06/11/2026, e canvas "Portal · Revisar o site", telas 07 a 09.
> **Depende do RS-1 e do RS-2.**

**Objetivo:**

- O cliente acompanha cada ajuste enviado.
- Confere o antes e o depois de cada ajuste e aprova ou pede outra mudança.
- O responsável pelo contrato aprova o site no fim.

**Não entra:**

- Aviso por WhatsApp. Os eventos já são gravados no RS-1, e o n8n trata em outro card.
- Orçamento de serviço adicional: usa o fluxo do S3 que já existe, em "Aprovações".

## Telas

### 07 · Acompanhar

Rota `/portal/site/revisar/rodadas`:

- As rodadas aparecem da mais nova para a mais antiga. Cada ajuste mostra a situação em frase normal: Enviado, Em andamento, Para você ver, Aprovado, Orçamento para aprovar ou Não vamos fazer (tabela do RS-1).
- A linha do projeto usa o símbolo das páginas do cliente:
  - etapa concluída = quadrado cheio;
  - etapa atual = o símbolo;
  - próxima etapa = contorno.
- "Orçamento para aprovar" leva à aprovação do serviço adicional que já existe (S3). Enquanto o orçamento está pendente, aquele ajuste não pode ser conferido (trava do RS-1).

### 08 · Antes e depois

Rota `/portal/site/revisar/ajuste/$id`:

- Para texto: o texto de antes e o de depois, um em cima do outro.
- Para foto: as duas fotos lado a lado, ou deslizando no celular.
- Para os outros tipos: a captura do lugar e a nota do Yuri.
- Ações empilhadas com a mesma largura:
  - "Aprovar este ajuste" (âmbar);
  - "Pedir outra mudança": abre o campo de texto (16 px) e grava na conversa do pedido.
- A partir da 3ª vez no mesmo ajuste, o RPC recusa (`limite_refacao`) e a tela explica: "Este ajuste já foi refeito duas vezes. Para mudar de novo, marque um ajuste novo na próxima rodada."
- "Aprovar este ajuste" é otimista, com volta atrás no erro.

### 09 · Aprovar o site

- Aparece só quando todos os ajustes estão aprovados ou fechados (recusados ou com orçamento resolvido).
- Três confirmações obrigatórias:
  1. "Conferi todas as páginas no celular e no computador."
  2. "Os textos, as fotos e os contatos estão certos."
  3. "Sei que, depois de aprovado, mudanças viram serviço adicional."
- O botão "Aprovar o site" fica no bloco de aceite e nunca aprova direto da barra.
- **Só o responsável pelo contrato com `can_approve`** (CX-0) vê o bloco de aceite.
- Pessoa da equipe vê o aviso: "Quem aprova o site é [nome do responsável]. Avisamos que está tudo pronto."
- Depois de aprovar, a tela mostra o dia e quem aprovou. A revisão fecha, e "Revisar o site" vira "Pedir um ajuste" (PC-2).

## Regras de interface

As mesmas do RS-2:

- Geist no texto, com `tabular-nums` nos números;
- Bricolage 800 no título principal;
- nenhum texto abaixo de 12,5 px e nenhum rótulo em caixa alta;
- âmbar uma vez por tela e alvos de toque com 44 px ou mais;
- nas telas 08 e 09, a barra de ação substitui as abas.

## Critérios de aceite

- [ ] **Situação:** pedido `pronto` sem validação aparece como "Para você ver" e soma no selo e em "Precisam de você". Depois de "Aprovar este ajuste", aparece como "Aprovado" e sai dos dois (teste).
- [ ] **Pedir outra mudança:** volta o pedido para "Em andamento" no Hub, com a mensagem na conversa. Na 3ª vez, a tela mostra o aviso do limite (teste com o RPC simulado).
- [ ] **Bloco de aceite:** pessoa da equipe não vê o bloco de aceite da tela 09, e o RPC também recusa (pgTAP no RS-1 e teste de componente aqui).
- [ ] **Aprovação:** aprovar o site sem as três confirmações não envia. Com as três, cria a aprovação "Aprovação final do site" no S3, que aparece em Aprovações no Hub e no portal.
- [ ] **Orçamento pendente:** um ajuste com orçamento pendente impede a tela 09 e mostra qual falta.
- [ ] `bun run build`, `bun run lint` e `bun run test` passam, com conferência no navegador em 390 e 1440 px.
