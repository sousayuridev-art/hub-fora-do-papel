# Card SS-1 · Módulos no projeto (sistemas sob medida)

> **Origem:** documento "Sistemas sob medida: entrega por módulos e Solicitações" (21/10/2026), seção 1.
> **Decisões (Yuri, 21/10):** parcelas continuam pelo projeto (módulo não tem parcela); mensalidade começa quando o **primeiro módulo** vai para produção; garantia conta da **publicação final** (último módulo no ar).

## Visão de negócio
O cliente começa a usar o que é prioridade (ex.: RH) sem esperar o sistema inteiro, e a mensalidade começa assim que existe sistema em uso. O Yuri acompanha cada módulo e só publica o que o cliente aprovou. Métrica: dias entre o início do projeto e o primeiro módulo publicado.

## Escopo
1. **Tipo do projeto:** `padrao` (fases em sequência, como hoje) ou `sob_medida` (módulos em paralelo). Escolhido ao criar ou editar o projeto. Projetos que já existem continuam `padrao`.
2. **Módulos** (tabela nova `project_modules`), cada um com nome, ordem, caminho e situação:
   - Situações: Planejado → Em desenvolvimento → Em testes (com link de testes) → Aguardando aprovação → Aprovado → Publicado (com link de produção e data). Também "Fora do escopo" (sai da conta sem apagar).
   - Caminho: **com homologação** (padrão) ou **publicação direta** (ajuste pequeno combinado).
3. **Aprovação do módulo:** "Pedir aprovação" usa as Aprovações que já existem, ligadas ao módulo. No portal, "Aprovar" → Aprovado; "Pedir ajuste" → volta para Em desenvolvimento, com o comentário, e conta uma **rodada**. Na 3ª rodada do mesmo módulo, aviso ao Yuri.
4. **Publicar:** o banco recusa publicar módulo com homologação sem aprovação registrada. Cada publicação grava **notas da versão** (o que entrou, em português simples), link e data. Republicar um módulo já no ar (nova versão) mantém o histórico.
5. **Mensalidade:** na primeira publicação de um módulo, se o projeto tem plano, a mensalidade nasce (mesma regra do Financeiro, sem duplicar se já existir).
6. **Fim do projeto:** quando todos os módulos estão Publicados ou Fora do escopo, o Hub sugere encerrar. A data da última publicação é a **publicação final**, de onde conta a garantia (`projects.final_release_at`).
7. **Hub › Projeto:** no lugar de "Fases", a seção "Módulos" com a situação de cada um e as ações do próximo passo (Começar, Enviar para testes, Pedir aprovação, Publicar, Fora do escopo).
8. **Portal:** a linha do projeto mostra um marco por módulo, com o símbolo da marca (publicado = quadrado cheio, em andamento = símbolo, planejado = contorno). Cada módulo publicado mostra "No ar desde" e as notas da versão. O resto do portal não muda.
9. **Eventos:** `modulo.publicado`, `modulo.aprovado`, `modulo.ajuste` na `event_outbox`.

## Não entra
- Solicitações vindas do sistema do cliente (SS-3/SS-4). Classificação "Correção na garantia" e "Novo módulo" (SS-2).
- Parcela por módulo (decisão 1).

## Segurança
- Tabela com `tenant_id` e RLS: o dono lê tudo; a pessoa do portal lê só os módulos dos projetos da própria empresa, pelas RPCs do portal. Toda mudança por RPC `security definer` com evento na mesma transação.
- A equipe do cliente vê os módulos e aprova (se tiver permissão); valores continuam só para o responsável (CX-0).

## Casos de borda
- Módulo publicado e depois reprovado: volta para Em desenvolvimento **sem sair do ar**; a última versão publicada continua valendo até a próxima.
- Projeto `sob_medida` sem módulos: aviso "Cadastre os módulos" e nada de linha vazia no portal.
- Trocar o tipo de um projeto com fases concluídas: recusado (só sem fases concluídas).
- Dois pedidos de aprovação abertos para o mesmo módulo: recusado.
- Publicação direta: não exige aprovação, mas registra quem publicou e as notas.

## Critérios de aceite
- [ ] Criar projeto sob medida com 3 módulos e ver cada um andar sozinho.
- [ ] Publicar módulo com homologação sem aprovação é recusado pelo banco.
- [ ] Primeira publicação cria a mensalidade uma vez só; a segunda não duplica.
- [ ] Ajuste pedido no portal volta o módulo e conta rodada; 3ª rodada avisa.
- [ ] Portal mostra um marco por módulo, no celular e no computador.
- [ ] Outra agência e cliente de outra empresa não veem módulos (teste de banco).
- [ ] `bun run build`, `bun run lint`, `bun run test` e testes de banco passam.
