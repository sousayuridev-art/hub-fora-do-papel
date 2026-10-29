# Card MK-3 · IA que sugere (versões, ganchos e revisão pela voz)

> **Origem:** PRD `docs/cards/MK-0-central-de-marketing-prd.md`, entrega MK-3 (29/10/2026). Pedido do Yuri: "Primeiro passo. MK3".
> **Regras que valem:** `docs/regras-ia.md` (chave só no servidor, registro de uso, teto mensal no código, IA sugere e pessoa decide, toda sugestão mostra de onde veio) e as skills `voz-fora-do-papel` e `conteudo-redes-fora-do-papel`.
> **Depende de:** MK-1 e MK-2 no ar.

**Objetivo:** a partir da ideia central e do briefing, a IA propõe o texto de cada versão do jeito daquele canal (gancho, texto, roteiro ou slides, chamada e hashtags) e revisa o texto pela voz da marca. Nada entra na peça sem a pessoa clicar em "Usar".

**Não entra:**

- imagem ou vídeo gerados por IA (direção do MK-0: a IA ajuda no texto, o design é feito por pessoa);
- publicar, responder comentário ou mensagem;
- IA para o cliente no portal;
- aprendizado com os resultados (fica para depois do MK-4, quando houver números).

## Requisitos

### Banco (`supabase/migrations/[data]_mk3_ia_que_sugere.sql`)

- **`ai_usage`** (tabela da regra de IA, primeira vez no Hub). Cada chamada grava:
  - tenant, projeto (`fdp-hub`), recurso (`marketing.versoes`, `marketing.ganchos`, `marketing.revisao`), modelo, tokens de entrada, de saída e de cache;
  - custo estimado em centésimos de centavo de dólar (inteiro; 1 = US$ 0,0001, para uma sugestão barata não virar zero), peça e quem pediu.
  - RLS só de leitura para o dono; gravação só pela função de servidor.
- **`ai_limits`:** teto mensal por tenant e área, na mesma unidade do custo (US$ 10 = 100000).
- **`mkt_ai_suggestions`:** a sugestão guardada, para a pessoa comparar e usar depois.
  - campos: versão, tipo, conteúdo em JSON, base usada (briefing, textos e versão do manual) e se foi usada;
  - fica 30 dias.
- **RPCs:**
  - `ia_uso_do_mes()`: gasto, teto e percentual, calculados no banco;
  - `mkt_sugestao_usar(id, campos[])`: aplica só os campos escolhidos pela mesma regra do `mkt_versao_editar` (avisos da marca, aprovação desfeita) e marca como usada.
- **Testes pgTAP:** `supabase/tests/mk3_ia.test.sql`. Cobrem o teto, o isolamento por tenant e que usar uma sugestão passa pela revisão da marca.

### Função de servidor (`supabase/functions/marketing-ia`)

- **Pedido:** recebe só o id da peça ou da versão e a ação. Confere o dono (sessão forte, SEG-1) e lê o briefing no banco; nunca recebe texto livre do navegador.
- **Chave:** a chave da Anthropic fica só nos segredos do Supabase (`ANTHROPIC_API_KEY_HUB`, workspace `fdp-hub`, nome definido no RE-0); nunca no navegador, no repositório ou em log.
- **Modelo:** Sonnet (`claude-sonnet-5-5`), porque é texto que vai a público (regra 4). Trocar de modelo é decisão de card.
- **Instruções fixas com cache:** manual de voz, regras de conteúdo por canal e regras desta tarefa. Por peça vão só o briefing e os textos. Dado de cliente só entra se a peça tem a autorização marcada.
- **Teto:**
  - antes de chamar, confere o teto do mês;
  - aos 80%, o Painel avisa;
  - aos 100%, a função recusa com `teto_mensal` e a tela explica;
  - limite de 30 pedidos por dia, contra clique repetido.
- **Resposta em JSON validado:** campos fora do formato são descartados e a sugestão registra o motivo.
- **Erros:** a API fora do ar ou lenta (tempo-limite de 40 s) vira mensagem clara com "Tentar de novo". Nunca grava sugestão pela metade.

### Telas

- **Aba Versões › Sugestões da IA (ao lado de cada versão):**
  - **"Sugerir esta versão":** gancho, texto, roteiro ou slides, chamada e hashtags pensados para o canal.
  - **"Mais ganchos":** 5 opções de gancho; clicar em uma põe no campo.
  - **"Revisar pela voz":** lista de trechos com o problema e a troca sugerida, além do que a revisão automática do MK-1 já pega. Por exemplo: começa pela ferramenta e não pelo problema, promessa que não controlamos, frase longa demais.
- **Cada sugestão:**
  - mostra a base usada (por exemplo: "Ideia central + briefing + manual de voz de 27/10") e quando foi feita;
  - tem "Usar tudo", "Usar" por campo e "Descartar". Usar passa pela mesma revisão da marca e pela mesma regra de aprovação desfeita.
- **Contador de uso:** "Uso da IA neste mês: US$ [valor] de US$ [teto]" no rodapé das sugestões, com aviso aos 80% e botões desligados aos 100%. Em dólar porque a Anthropic cobra em dólar.
- **Sem briefing completo:** os botões ficam apagados e a tela diz o que falta (a IA não inventa objetivo nem pilar).
- **Feedback:** carregando com texto ("Escrevendo a versão do Instagram…"); erro com toast e "Tentar de novo".

## Critérios de aceite

- [ ] Dado um briefing completo e uma versão de carrossel do Instagram, quando peço "Sugerir esta versão", então recebo gancho, texto, 3 a 8 slides e uma chamada da lista do manual, e nada muda na peça até eu clicar em "Usar".
- [ ] "Usar" num texto com marcador gera o mesmo aviso que bloqueia a aprovação no MK-1.
- [ ] Com o teto do mês atingido, a função recusa sem chamar a API e a tela explica.
- [ ] Toda chamada aparece em `ai_usage` com modelo, tokens e custo estimado.
- [ ] Dono de outro tenant não pede sugestão para peça minha nem lê `ai_usage` ou `mkt_ai_suggestions`.
- [ ] A chave não aparece no navegador, nas respostas nem nos logs.
- [ ] Sem rede ou com a API fora do ar, o botão volta ao normal e aparece "Tentar de novo".
- [ ] `supabase test db`, `bun run build`, `bun run lint` e `bun run test` passam; a função tem testes da lógica pura (montagem do pedido, validação da resposta, cálculo do custo).

## Para o Yuri antes de publicar

- No Console da Anthropic, workspace `fdp-hub`: criar a chave e pôr o limite de gasto do workspace.
- No Supabase de produção, em Edge Functions › Secrets: guardar `ANTHROPIC_API_KEY_HUB`. Só você faz isso, porque a chave não pode passar pelo chat.
- Rodar o fluxo "Banco de produção" e publicar a função (instruções no PR).
- Medir no piloto quanto custa, em média, uma sugestão de versão, antes de usar em peças de clientes (regra 5).

## Decisões (Yuri, 29/10)
1. **Teto mensal da Central:** US$ 10.
2. **Ações:** as três entram agora (sugerir a versão, mais ganchos e revisar pela voz).

## Como ficou (implementação, 29/10)
- **Preço do modelo:** fica na tabela `ai_model_prices`, corrigível sem mexer no código. O valor inicial do Sonnet 5.5 foi conferido em 29/10/2026 numa fonte de terceiros e deve ser conferido no Console da Anthropic: US$ 2 por milhão de tokens de entrada, US$ 10 de saída, US$ 2,50 de escrita no cache e US$ 0,20 de leitura do cache.
- Falhas da IA também contam no limite de 30 pedidos do dia (protege contra clique repetido quando a API está instável) e ficam em `ai_usage` com o motivo.
- A função `marketing-ia` exige login na porta (`verify_jwt = true`) e confere o dono de novo no banco.
- Teste local sem gastar: `MARKETING_IA_API_URL` aponta a função para um servidor falso; em produção essa variável não existe e vale o endereço da Anthropic.
- Reserva: antes de chamar a IA, o banco trava o tenant, confere teto e limite e já grava o pedido em `ai_usage` com o custo máximo; depois troca pelo custo real. Pedidos em paralelo não furam o teto, e uma versão apagada no meio não some da conta. No tempo esgotado fica a reserva (a API pode ter cobrado).
- Revisão pela voz: cada troca diz o campo (gancho ou texto) e só entra se o trecho aparece uma vez nele.
- Aviso de 80% aparece também no Painel do Hub.
- **Para o Yuri confirmar:** o contador e o aviso mostram dólar (a Anthropic cobra em dólar) e ficam logo abaixo das sugestões, não no rodapé da aba.
