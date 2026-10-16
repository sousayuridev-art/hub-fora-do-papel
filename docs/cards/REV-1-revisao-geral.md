# Card REV-1 · Revisão geral do Hub (16/10)

> Pedido do Yuri em 16/10: revisão crítica como gestor, designer, PMO e PM, com correção do que tiver mais impacto, preservando o que funciona.
> Feita com três revisões independentes (segurança do banco, código das telas, produto e processos) e teste real de todas as rotas como dono, cliente do portal e visitante.

## Corrigido neste card

### Segurança e dados (migração `20261016300000_rev1_seguranca_painel.sql`)
- **Papéis só por convite:** o dono não consegue mais dar papel de dono a outra pessoa nem mexer em vínculos pelo app (antes dava para "puxar" os dados de outra agência). `_tenant_do_dono` recusa quem é dono de duas empresas em vez de escolher uma em silêncio.
- **Clientes só por RPC:** sem escrita direta em `clients`; apagar um cliente não leva mais junto as propostas aceitas (chave estrangeira `restrict`).
- **Aceite preso à versão vista:** o cliente só aceita a versão que está na tela; se o Yuri reabriu e mudou o valor, o aceite é recusado e a página recarrega a versão nova.
- **Formulário do site:** limite de 30 envios a cada 10 minutos por agência e 8 por hora por endereço; horário sugerido até 120 dias.
- **Pedido do site de quem já é cliente** vira evento "não verificado" na linha do tempo, não anotação na ficha (qualquer um pode digitar o e-mail de um cliente).
- **Portal:** o cliente não lê mais a tabela de clientes (origem, indicação e anúncio são internos); o nome da empresa vem de `portal_minha_empresa()`.
- **Permissões que sobraram:** `site_contatos` sem acesso para anon; visões sem escrita; funções auxiliares sem execução para anon; índices em `proposals(deal_id, plan_id)`.
- **IP do aceite** vem do Cloudflare ou do último salto do proxy (não do que o navegador manda).

### Regras de negócio
- Oportunidade fechada por aceite não volta para etapa aberta.
- Arquivar a oportunidade retira a proposta enviada (o link para de aceitar).
- No aceite, a ficha ganha o próximo passo "Combinar o início e a 1ª cobrança".
- **Preços conferidos:** nenhuma proposta sai enquanto os preços de Configurações não forem conferidos e salvos uma vez.

### Painel (gestor)
- Novos números: **Fechado no mês** e **Propostas aguardando** (valor e quantas o cliente já abriu).
- **Novidades dos últimos 7 dias:** proposta aberta, aceita ou recusada e pedidos do site, com link para a ficha. Substitui, até o n8n existir, o aviso que não chegava.
- Aviso quando um pedido do site não entra no funil.
- "Precisa de você hoje" usa o dia calculado no fuso da agência (antes, passos depois das 21h apareciam no dia seguinte).

### Telas
- Salvamento automático da proposta: não repete sozinho depois de erro; versão desatualizada para e pede recarregar; recarregamento antigo não volta a versão; aviso ao fechar a aba com mudança pendente.
- Envio que falha não desfaz o que já foi salvo; "Editar e reenviar" só libera a edição com a versão nova.
- Números no jeito brasileiro: "1.200" é mil e duzentos em todos os campos; valores com centavos aparecem com centavos.
- "Tentar de novo" no funil usa a versão atual; cada ação guarda a versão nova.
- Formulários (preços, editar ficha) não perdem o que está sendo digitado quando a tela recarrega.
- Depois de entrar, volta para o endereço completo (com a proposta aberta).
- Busca encontra qualquer cliente da base, não só os 200 mais recentes.
- Ficha do cliente mostra as propostas dele; linha do tempo com estado de carregamento.
- Página da proposta: sem promessa de aviso que ainda não existe; nota de privacidade no aceite.
- Mensagem de WhatsApp com o nome de quem está logado; cartão da conta diz "Dono da conta".
- Menu diz "Funil de vendas" (glossário); "Em breve" legível no item ativo.
- Telas "Em breve" explicam o que vai existir e o que usar enquanto isso (Hub e portal).
- Configurações e Propostas sem rolagem lateral; botões de ações e de fechar painéis com 44 px.

### Processo
- **Conferência automática no GitHub** (`.github/workflows/ci.yml`): lint, testes, build e testes do banco a cada envio.
- `docs/como-rodar.md` atualizado.

## Critérios de aceite
- 113 testes do banco, testes de código, build e lint passando.
- E2E: funil (14), propostas do envio ao aceite no celular (13), tráfego (5), sem erro de página.
- Varredura de todas as rotas (dono, cliente, visitante) a 1440 e 390 px sem rolagem lateral.

## Fica para os próximos cards (ordem recomendada)
1. **OPS · Operação segura:** e-mail próprio (SMTP) para o link de acesso, backup diário com ensaio de restauração, segundo acesso de dono, monitoramento de erros.
2. **S6a · Avisos pelo n8n:** consumir `event_outbox` (contato do site, proposta aberta/aceita/recusada, falhas) e avisar no WhatsApp.
3. **S4 · Financeiro mínimo:** parcelas no aceite, mensalidade como receita recorrente, diagnóstico como receita, "a receber".
4. **S3 · Projetos e portal:** projeto nasce no aceite, acesso do cliente, Início/Aprovações/Pagamentos com dados reais. Não convidar clientes para o portal antes.
5. **S7 · Relatórios:** conversão por etapa, motivos de perda, tempo até o aceite, previsão.
6. **WL · Segunda empresa na plataforma:** marca e responsável por empresa, formulário do site por empresa.

Itens menores anotados: valor de proposta acima de R$ 1 milhão (limite atual do banco), "Essencial" usado no diagnóstico e no plano, versão do Supabase CLI fixa nos workflows, eventos de outras ações no `event_outbox`, colunas do funil no celular contam só os itens carregados.
