# SIS-2 · Pedidos de ajuste que chegam dos sistemas

Pedido do Yuri (03/11/2026): os pedidos do Orga CRM (Plamev) hoje ficam no próprio sistema, e é o Yuri quem os lê lá. Ele quer que cheguem ao Hub, e que o sistema pare de guardá-los. Vale para todos os sistemas daqui para frente.
Decisões do Yuri: a equipe do cliente acompanha **dentro do próprio sistema**; os pedidos **abertos** de hoje vão para o Hub; o Hub ganha **texto, prints e conversa**.

## Visão de negócio
Todo pedido de ajuste num lugar só (o Hub), com triagem (dentro do combinado, mensalidade ou serviço adicional) e a linha do tempo do projeto. O cliente não precisa de outra senha: continua pedindo e acompanhando onde já trabalha.

## Como funciona
1. Na página do sistema (Entregar › Sistemas › aba **Integração**), o Yuri gera a chave. Ela aparece uma vez; o Hub guarda só o sha256.
2. A chave vai para os segredos do projeto do sistema no Lovable (`HUB_CHAVE_SISTEMA`), junto com o endereço (`HUB_PEDIDOS_URL`). Nunca no código nem no navegador.
3. O servidor do sistema chama a função `sistema-pedidos` com o cabeçalho `x-hub-chave`:
   - `GET /pedidos` (até 300), `GET /pedidos/:id` (descrição, conversa e prints com endereço de 10 min);
   - `POST /pedidos` { titulo, descricao, tipo, prioridade, solicitante { nome, id } };
   - `POST /pedidos/:id/mensagens` { autor_nome, texto };
   - `POST /pedidos/:id/prints` (corpo = imagem png, jpg ou webp, até 2 MB, até 5 por pedido).
4. O pedido entra em Pedidos de ajuste com origem **Sistema · nome**, ligado ao cliente e ao projeto do sistema, com quem pediu, tipo e prioridade (urgente vira "Urgente" no Hub).
5. No painel do pedido, o Yuri vê os prints e a conversa e responde. A situação e a resposta aparecem no sistema do cliente.

## Segurança
- Função sem CORS (só servidor chama) e sem JWT; a chave é conferida no banco. As funções `_sis_*` são liberadas só para `service_role` e sempre presas ao sistema da chave: um sistema nunca vê pedido de outro.
- Tipo do print conferido pelos bytes; caminho do arquivo montado no servidor (`{tenant}/{pedido}/{uuid}.ext`) e conferido no banco.
- Limites: 100 pedidos e 500 mensagens por sistema por dia, 5 prints por pedido.
- Trocar a chave invalida a anterior na hora; "Desligar" apaga a chave.
- Logs sem chave, texto do pedido ou nome de pessoa.

## Importação dos pedidos abertos
`POST /pedidos` com `externo_id` (id no sistema), `situacao` (recebido, em análise ou fazendo) e `criado_em` mantém a situação e a data de origem. Repetir a importação devolve o mesmo pedido (sem duplicar).

## Critérios de aceite
- [ ] Gerar a chave mostra a chave uma vez, com o endereço e os nomes dos segredos.
- [ ] Pedido criado pelo sistema aparece em Pedidos de ajuste com origem "Sistema · Orga CRM", quem pediu, tipo e prioridade.
- [ ] Prints aparecem no painel do pedido; a resposta do Yuri aparece no detalhe que o sistema lê.
- [ ] Chave errada, de outro sistema ou revogada: 401; pedido de outro sistema: 404 (teste `sis2_pedidos_pelo_sistema.test.sql`).
- [ ] Importar duas vezes não duplica.

## Arquivos
`supabase/migrations/20261103140000_sis2_origem_sistema.sql`, `supabase/migrations/20261103140100_sis2_pedidos_pelo_sistema.sql`, `supabase/tests/sis2_pedidos_pelo_sistema.test.sql`, `supabase/functions/sistema-pedidos/`, `.github/workflows/banco-producao.yml`, `supabase/config.toml`, `src/lib/pedidosSistema.ts`, `src/lib/pedidos.ts`, `src/components/pedidos/PedidoConversa.tsx`, `src/components/pedidos/PedidoPainel.tsx`, `src/components/sistemas/SistemaIntegracao.tsx`, `src/routes/app/sistemas/$id.tsx`, `src/test/sis-2.test.ts`.

Lado do sistema do cliente: card SIS-3 no repositório `crm-vendas-yuri`.
