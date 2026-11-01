# HUB-CG · Catálogo de loja editado pelo Hub (PRD + cards HUB-CG-01 a 04)

> **Ajustes do Yuri (01/11), valem sobre o texto original abaixo:**
> 1. O catálogo pertence a um **site da central de Sites** (módulo `catalogo`), não ao tenant: tudo tem `site_id` + `tenant_id` + RLS.
>    A CG vira um site com o módulo Catálogo; Produtos, Categorias, Depoimentos, Ajustes da loja e Publicar são abas da página do site. Sem menu novo.
> 2. **Mesmo formato do banco do site da Fora do Papel** (CMS-1/CMS-3): rascunho nas tabelas, versão publicada validada
>    (`site_catalogo_publicacoes`), leitura pública `site_publico_catalogo(dominio)` e fotos no bucket público `site-midia`.
>    O site da CG passa a ler o banco (com os dados atuais do arquivo como reserva), em vez de o Hub gerar e baixar um HTML.
>    Isso substitui o card 04 original (geração do arquivo) e o P2 de fotos em storage.
> 3. Nomes no padrão do banco do site (`site_catalogo_*`, em português).

## Estado (01/11)
- [x] HUB-CG-01: banco, RPCs com evento, validação de publicação, leitura pública, contagem por categoria em view. pgTAP `hub_cg_01.test.sql` (24).
- [x] HUB-CG-02: Produtos (lista virtualizada, painel com preço em centavos, tamanhos, cores, selo, até 4 fotos de até 900 px).
- [x] HUB-CG-03: Categorias (capa até 800 px, apagar só vazia), Depoimentos (com aviso de autorização), Ajustes da loja (WhatsApp, endereço, horário, Instagram, Promoções, marcas) e fotos do site (capa 1400, fachada 1200, Instagram 700).
- [x] HUB-CG-04 (novo formato): Publicar valida no banco, grava a versão (uma por vez; sem mudança não cria versão) e mostra o histórico.
- [ ] **Importação inicial** e **site da CG lendo o banco**: dependem de `INTEGRACAO-CATALOGO-CG.md`, `catalogo-cg.mjs` e do HTML em produção (não recebidos).
  O banco já tem `site_catalogo_importar(site, dados)` (idempotente) no formato de `site_publico_catalogo`; falta converter a saída do `extrairCatalogo` (fotos data-URL → arquivos no bucket) e o trecho do site.

## Formato publicado (o que o site lê)
```json
{ "versao": 3, "publicado_em": "...",
  "config": { "whatsapp": "79999990001", "endereco": "...", "horario": "...", "instagram": "cgmoda", "mostrar_promocoes": true,
              "marcas": ["..."], "fotos": { "hero": "<site_id>/arquivo.webp", "fachada": "...", "ig1": "..." } },
  "categorias": [{ "slug": "camisas-polo", "nome": "Camisas polo", "foto": "<site_id>/x.webp" }],
  "produtos": [{ "codigo": 1, "nome": "...", "categoria": "camisas-polo", "marca": "...", "preco_cents": 1999000,
                 "tamanhos": ["P"], "cores": [{"nome": "Azul", "tom": "#1F3A93"}], "selo": "promo", "promo_pct": 20,
                 "fotos": ["<site_id>/x.webp"] }],
  "depoimentos": [{ "texto": "...", "autor": "..." }] }
```
Fotos: `{SUPABASE_URL}/storage/v1/object/public/site-midia/{caminho}`. Preço nulo = "Consulte".

---

## Texto original do PRD e dos cards (01/11)

# PRD · Catálogo da CG editado pelo Hub

> Origem: decisão do Yuri em 01/11/2026 — o catálogo da CG Moda Masculina passa a ser modificado pelo sistema da Fora do Papel. Contrato técnico já pronto e testado: `INTEGRACAO-CATALOGO-CG.md` + `catalogo-cg.mjs`.

## Problema
O catálogo da CG é um arquivo HTML único editado hoje por um painel standalone solto (sem login, sem histórico, arquivo trocado na mão). Toda alteração de produto, preço ou foto depende de um fluxo manual fora do Hub, sem rastro de quem mudou o quê — e sem caminho para a Fora do Papel operar isso como serviço recorrente para mais lojas.

## Objetivos
1. O catálogo da CG é editado inteiro dentro do Hub (produtos, fotos, categorias, depoimentos, configurações) e publicado de lá.
2. Alteração de preço ou produto sai no site publicado em menos de 5 minutos, sem tocar em código.
3. Toda mudança fica registrada (quem, quando, o quê) via eventos.
4. A estrutura serve para um segundo catálogo de outro cliente sem retrabalho (multi-tenant desde o início).

## Não-objetivos
- Checkout/pagamento no site — o modelo é fechar pelo WhatsApp (decisão do cliente).
- Portal do cliente CG editando o próprio catálogo — fase futura; agora quem edita é a Fora do Papel (ver P2).
- Migrar as fotos de data-URL para storage com URL — só quando o peso do arquivo incomodar (registrado em P2 para não fechar a porta).
- Reescrever o site do catálogo — o arquivo atual é o contrato; o Hub se adapta a ele, não o contrário.

## Histórias
- Como Yuri, quero alterar preço e selo de um produto no Hub e publicar, para atender o pedido da loja no mesmo dia.
- Como Yuri, quero criar um produto com até 4 fotos tiradas do WhatsApp da loja, para manter o catálogo vivo sem abrir editor de imagem.
- Como Yuri, quero importar o site em produção uma única vez, para não redigitar os 10 produtos existentes.
- Como Yuri, quero que uma publicação com dado inválido seja bloqueada com mensagem clara, para nunca derrubar o site da cliente.
- Erro: sem rede no meio da publicação → nada é meio-publicado; o arquivo só muda inteiro.
- Vazio: categoria sem produtos aparece no Hub com aviso, e o site continua renderizando.
- Limite: depoimento com `</script>` ou emoji publica sem quebrar a página.

## Requisitos priorizados
- **P0** Banco multi-tenant do catálogo (produtos, categorias, depoimentos, configurações, fotos) com RLS, escrita por RPC e preço em `price_cents integer`.
- **P0** Importação inicial a partir do HTML em produção (`extrairCatalogo`).
- **P0** Telas de edição no Hub (CRUD de produtos com fotos; categorias; depoimentos; configurações).
- **P0** Publicação: montar `data` do banco → `validarCatalogo` → `injetarCatalogo` sobre o HTML base vigente → entregar o arquivo.
- **P1** Histórico de publicações (arquivo gerado + data + autor) com re-download de versões.
- **P1** Publicação automática no Lovable. Atenção: edição de projeto Lovable via agente consome créditos e não é determinística; avaliar a API pública do Lovable para subir o arquivo direto — se não houver caminho determinístico, mantém download + atualização manual do projeto.
- **P2** Portal do cliente com edição restrita (preço/estoque) e aprovação da Fora do Papel.
- **P2** Fotos em storage com URL pública, encolhendo o arquivo publicado.

## Casos de borda
Duplo clique em "Publicar" (uma publicação por vez); sessão expirada no meio do formulário (rascunho não se perde); dados de outro cliente invisíveis (RLS por tenant); produto excluído que está em `productImgs` (limpar junto); categoria excluída com produtos (bloquear); campo de preço vazio (continua vazio, não vira 0,00); celular com teclado aberto no formulário de produto.

## Métrica de sucesso
- Rápida: tempo entre pedido de alteração da loja e site publicado (hoje: manual e sem medição; meta < 5 min).
- Confirma depois: nº de alterações/mês feitas pelo Hub sem retrabalho (zero publicações revertidas por dado inválido).

## Decisões (respondidas pelo Yuri em 01/11/2026)
1. **Hospedagem: Lovable.** O arquivo do site vive num projeto Lovable. P0 do Card 04 continua sendo gerar o arquivo; a publicação no Lovable é o passo final (manual por ora — ver P1 e a ressalva no Card 04).
2. **Sem cobrança por enquanto** — o dono da CG é irmão do Yuri; a negociação é à parte. Nenhum card depende disso.
3. **O Hub já tem componente de upload/redimensionamento** — o Card 02 reaproveita em vez de criar um novo.

---

# Card HUB-CG-01 · Banco do catálogo + importação inicial

> **Origem:** PRD "Catálogo da CG editado pelo Hub", 01/11/2026
> **Decisões:** contrato de dados fechado (`INTEGRACAO-CATALOGO-CG.md`); preço em centavos; multi-tenant desde já

**Objetivo:** o catálogo da CG vive no banco do Hub, importado do site em produção, pronto para as telas de edição.

**Não entra:**
- Telas (Card 02/03) e publicação (Card 04).
- Storage de imagens — fotos ficam como data-URL em coluna `text`, como no contrato.

## Requisitos
### Banco (`supabase/migrations/[data]_hub_cg_01.sql`)
- Tabelas, todas com `tenant_id` + RLS e escrita só por RPC `security definer`:
  - `catalog_settings` (tenant_id pk, whatsapp_number, show_promo_banner, address, hours, instagram)
  - `catalog_categories` (id slug, tenant_id, name, photo text, position)
  - `catalog_products` (id int, tenant_id, name, category_id fk, brand, **price_cents integer**, sizes jsonb, colors jsonb, badge text null check in ('novo','mais-vendido','promo'), promo_pct int null, position)
  - `catalog_product_photos` (product_id fk, tenant_id, position 0–3, data_url text)
  - `catalog_testimonials` (id, tenant_id, quote, author, position)
  - `catalog_site_photos` (tenant_id, slot check in ('hero','fachada','ig-1'…'ig-6'), data_url)
  - `catalog_brands` (tenant_id, name, position)
- Constraint: `promo_pct` entre 1 e 90 obrigatório quando `badge = 'promo'`, nulo caso contrário.
- RPCs de escrita (upsert/delete por entidade) gravando evento em `event_outbox` (quem, quando, o quê).
- RPC `catalog_import(tenant_id, payload jsonb)`: recebe o objeto do `extrairCatalogo` e popula tudo numa transação (idempotente: reimportar substitui).
- Agregações (contagem de produtos por categoria) em view, não no cliente.

## Critérios de aceite
- Dado o HTML em produção, quando rodo `extrairCatalogo` + `catalog_import`, então o banco tem os 10 produtos, 5 categorias, 3 depoimentos, 5 marcas e as 13 fotos fixas, com `price_cents` idêntico ao arquivo.
- Dado um usuário de outro tenant, quando consulta qualquer tabela do catálogo, então vê zero linhas.
- Dado `badge='promo'` sem `promo_pct`, quando tento gravar via RPC, então recebo erro legível e nada é gravado.
- Dado um preço `199.90` (float), quando tento gravar, então a RPC rejeita (apenas inteiro de centavos).
- pgTAP `supabase/tests/hub_cg_01.test.sql` passa; `bun run build`, `bun run lint` e testes passam.

## Para o Yuri depois de publicar
- Rodar a importação inicial apontando para o arquivo em produção e conferir no Hub os totais acima.

---

# Card HUB-CG-02 · Tela de produtos do catálogo

> **Origem:** PRD "Catálogo da CG editado pelo Hub", 01/11/2026
> **Decisões:** campo de dinheiro no padrão `dinheiro-pt-br` (componente único, centavos); até 4 fotos por produto, a 1ª é a principal

**Objetivo:** Yuri gerencia os produtos da CG (criar, editar, excluir, fotos, selo) inteiramente pelo Hub, no celular ou desktop.

**Não entra:**
- Categorias, depoimentos, configurações (Card 03); publicação (Card 04).
- Reordenação drag-and-drop (P1; `position` já existe no banco).

## Requisitos
### Telas
- Catálogo CG › Produtos: lista com foto, nome, marca, categoria, selo e preço (`moeda()`); busca por nome; botão "Novo produto".
- Produto › formulário: nome, marca (sugestões das existentes), categoria (select), preço (**CampoDinheiro**: R$ fixo, milhar ao digitar, vírgula 2 casas, devolve centavos, vazio = null), tamanhos (chips), cores (nome + seletor de tom), selo (nenhum/novo/mais vendido/promoção + % quando promoção), fotos (reaproveitar o componente de upload/redimensionamento já existente no Hub, configurado para ≤ 900 px JPEG ~0,82; até 4 fotos; tocar define a principal).
- Exclusão com confirmação no próprio botão (sem dialog nativo); TanStack Query com atualização otimista; alvos de toque ≥ 44 px; textos em português simples.

## Critérios de aceite
- Dado o formulário novo, quando digito `19990` no preço, então vejo `19.990` e, ao sair do campo, `19.990,00`; o que vai à RPC é `1999000`.
- Dado um produto com selo Promoção, quando salvo sem %, então o formulário bloqueia com mensagem no campo.
- Dado upload de foto de 4000 px, quando salvo, então a foto gravada tem no máximo 900 px no maior lado.
- Dado duplo clique em "Salvar", então apenas um produto é criado.
- Dado usuário de outro tenant, então a tela lista zero produtos da CG.
- `bun run build`, `bun run lint` e testes passam.

## Para o Yuri depois de publicar
- Cadastrar um produto real de teste com foto enviada pela loja e conferir a renderização no preview do Card 04.

---

# Card HUB-CG-03 · Categorias, fotos do site, depoimentos e configurações

> **Origem:** PRD "Catálogo da CG editado pelo Hub", 01/11/2026
> **Decisões:** categoria só é excluída vazia; aviso de autorização por escrito nos depoimentos

**Objetivo:** todo o resto do catálogo (além de produtos) é editável no Hub.

**Não entra:**
- Produtos (Card 02); publicação (Card 04).

## Requisitos
### Telas
- Categorias: renomear, trocar capa (≤ 800 px), criar (slug gerado do nome), excluir apenas com zero produtos (botão desabilitado com motivo).
- Fotos do site: hero (≤ 1400 px), fachada (≤ 1200 px) e os 6 quadros do Instagram (≤ 700 px), cada um com preview e "Trocar foto".
- Depoimentos: lista editável (texto + autor), criar/excluir, com aviso fixo: publicar somente depoimento real com autorização por escrito.
- Configurações: WhatsApp da loja, endereço, horário, @ do Instagram, liga/desliga da seção Promoções, marcas parceiras (chips).

## Critérios de aceite
- Dado uma categoria com produtos, quando tento excluir, então o botão está desabilitado e explica o motivo.
- Dado um novo depoimento com `</script>` no texto, quando salvo, então grava e (no Card 04) publica sem quebrar a página.
- Dado o toggle de Promoções desligado, quando publico, então a seção não aparece no site.
- Dado usuário de outro tenant, então nenhuma dessas telas mostra dados da CG.
- `bun run build`, `bun run lint` e testes passam.

## Para o Yuri depois de publicar
- Conferir com a loja se o horário e o endereço atuais seguem valendo antes da primeira publicação.

---

# Card HUB-CG-04 · Publicação do site

> **Origem:** PRD "Catálogo da CG editado pelo Hub", 01/11/2026
> **Decisões:** usar `catalogo-cg.mjs` como única porta de leitura/escrita do HTML; publicar sempre sobre o HTML base vigente

**Objetivo:** com um botão, o Hub valida o catálogo, gera o arquivo do site e o entrega para ir ao ar.

**Não entra:**
- Publicação automática no Lovable (P1 — ver ressalva abaixo; por ora, download do arquivo e atualização manual do projeto Lovable).
- Edição do HTML fora do bloco de dados.

> **Ressalva Lovable:** o site é um arquivo estático único dentro de um projeto Lovable. Atualizar via agente do Lovable (send_message) consome créditos e pode alterar o arquivo de forma não determinística — risco de corromper o bloco `__CG_DATA__`. O caminho seguro hoje: baixar o arquivo do Hub e substituir o conteúdo no projeto Lovable manualmente; o caminho automático (P1) só entra se a API pública do Lovable permitir subir o arquivo exato, byte a byte.

## Requisitos
### Banco (`supabase/migrations/[data]_hub_cg_04.sql`)
- `catalog_publications` (tenant_id, id, created_at, created_by, file_ref, resumo jsonb) + RPC de registro com evento em `event_outbox`.
- Armazenar o **HTML base vigente** por tenant (a última versão do site entregue pela Fora do Papel) e o último publicado.
### Telas
- Catálogo CG › Publicar: resumo do que mudou desde a última publicação, botão "Validar e gerar site"; erros do `validarCatalogo` listados em português; sucesso gera o arquivo para download e registra a publicação.
- Histórico: lista de publicações com data, autor e re-download.

## Critérios de aceite
- Dado o catálogo íntegro, quando publico, então o arquivo gerado abre offline, mostra os dados do banco e fecha um pedido completo de WhatsApp em 360 px.
- Dado um produto com categoria inexistente (dado corrompido à mão no banco), quando publico, então a geração é bloqueada com a mensagem do validador e nada é gerado.
- Dado duplo clique em "Publicar", então existe apenas um registro de publicação.
- Dado uma nova versão de design do site (novo HTML base cadastrado), quando publico, então o arquivo sai com o design novo e os dados do banco, sem mudança no Hub.
- pgTAP `supabase/tests/hub_cg_04.test.sql` passa; `bun run build`, `bun run lint` e testes passam.

## Para o Yuri depois de publicar
- Substituir o arquivo no projeto Lovable pelo gerado e conferir o site no ar pelo celular (fluxo completo até a mensagem de WhatsApp).
- Verificar na API pública do Lovable se há upload determinístico de arquivo, para destravar o P1 de publicação automática.
