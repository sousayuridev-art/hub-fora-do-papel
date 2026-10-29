# REV-5 · Correções urgentes do diagnóstico (29/10/2026)

Origem: diagnóstico "Evolução contínua do Hub e do site", itens urgentes 2, 3, 6, 7, 8 e 9.
Os itens 1, 4 e 5 (site) estão no card SITE-21 do repositório do site.

## Visão de negócio
Fechar os furos que distorcem números de venda, deixam contato sem dono ou abrem risco de segurança,
antes do redesenho das telas.

## Requisitos
1. **Fechado com prova.** Mover para Fechado sem proposta aceita exige motivo escrito (até 400 caracteres),
   gravado no histórico da oportunidade. Arrastar para Fechado abre o painel "Mover para" com o campo.
2. **Recusa não some.** Proposta recusada (pelo link ou marcada no Hub) dá à oportunidade o próximo passo
   "Proposta recusada: conversar e decidir entre nova proposta ou arquivar" com data de hoje.
   Não arquiva sozinha: a pessoa decide.
3. **Sem SVG nos materiais.** Bucket e regra do banco deixam de aceitar `image/svg+xml`; arquivos antigos
   continuam só para baixar.
4. **Fila de integrações.** `outbox_reservar(limite)` e `outbox_confirmar(id, erro)` só para o servidor
   (`service_role`), com reserva de 5 minutos e no máximo 10 tentativas. Uso em `docs/integracoes-n8n.md`.
5. **Mensalidades sem corrida.** Geração uma vez por dia por empresa, com trava; mudança em mensalidade
   ou pausa libera nova geração no mesmo dia.
6. **Proposta e telas protegidas.** Toda página HTML sai com `frame-ancestors 'none'`, `X-Frame-Options: DENY`,
   `nosniff` e `Referrer-Policy`; a proposta pública usa `no-referrer` (o endereço tem o código).

## Casos de borda
- Oportunidade fechada por aceite continua sem voltar para etapa aberta (gatilho do REV-1).
- Recusa em oportunidade arquivada ou já fechada não mexe no próximo passo.
- Motivo só com espaços não vale.
- Evento reservado e não confirmado volta à fila depois de 5 minutos.

## Critérios de aceite
- [x] `supabase/tests/rev5_correcoes.test.sql` (16 verificações) e todos os testes do banco passam.
- [x] `bun run test`, `bun run lint` (sem erros) e `bun run build` passam.
- [ ] Depois de publicar: arrastar uma oportunidade para Fechado pede o motivo.
- [ ] Depois de publicar: `curl -I` na proposta mostra `x-frame-options: DENY`.

## Métrica de sucesso
Nenhuma oportunidade em Fechado sem proposta aceita ou motivo; nenhuma proposta recusada sem próximo passo.
