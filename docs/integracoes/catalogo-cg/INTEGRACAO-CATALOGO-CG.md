# Integração do Catálogo CG no Hub da Fora do Papel

O site do catálogo é **um arquivo HTML único e autossuficiente** com os dados embutidos num bloco JSON entre marcadores. Qualquer sistema que respeite este contrato pode editar o catálogo — o Painel standalone foi o primeiro cliente; o Hub será o segundo. O site em si **não precisa de nenhuma mudança** para a integração.

## Anatomia do arquivo

```
<html> … CSS … markup …
<script>
const DATA = /*__CG_DATA__*/{ …json… }/*__CG_DATA_END__*/;
… lógica do site (não tocar) …
</script>
```

Regra de ouro: o Hub só lê e reescreve **o que está entre os marcadores**. Todo o resto do arquivo é o "motor" do site e muda apenas quando uma nova versão do catálogo for entregue pela Fora do Papel.

## Módulo pronto

`catalogo-cg.mjs` (sem dependências, Node ≥ 18 ou browser):

| Função | Faz |
|---|---|
| `extrairCatalogo(html)` | Devolve `{ data, meta }` ou lança erro se o arquivo não tiver o contrato |
| `validarCatalogo(data)` | Lista de erros legíveis (`[]` = ok) |
| `injetarCatalogo(html, data)` | Valida e devolve o HTML novo — **recusa dado inválido** |
| `moeda(cents)` | Exibição única de preço (`Intl`, pt-BR) |

Já testado contra o arquivo real: ida e volta sem perdas, `</script>` em texto de usuário é escapado (`<\/`), dado inválido não entra.

## O contrato (campo a campo)

```jsonc
{
  "config": {
    "whatsappNumber": "+55 79 99651-6350",  // destino dos pedidos
    "showPromoBanner": true,                 // liga/desliga seção Promoções
    "address": "…", "hours": "…", "instagram": "@cgmodamasculinaa"
  },
  "categories": [ { "id": "camisetas-polos", "name": "Camisetas & Polos" } ],
  "products": [ {
    "id": 5,                     // inteiro único
    "name": "Jeans Slim Fit",
    "category": "jeans-calcas",  // precisa existir em categories
    "brand": "Delta Denim",
    "priceCents": 21990,         // SEMPRE centavos inteiros — nunca 219.90
    "sizes": ["38","40","42"],   // ≥ 1
    "colors": [ { "n": "Azul Escuro", "h": "#2b3b52" } ],  // ≥ 1
    "badge": "promo",            // null | "novo" | "mais-vendido" | "promo"
    "promoPct": 20               // obrigatório (1–90) se badge = "promo"
  } ],
  "testimonials": [ { "quote": "…", "author": "Rafael M." } ],
  "brands": ["Cast & Co", "Norte"],
  "img": {                       // fotos fixas (data-URL jpeg OU URL https de storage)
    "hero": "data:image/jpeg;base64,…",
    "fachada": "…",
    "cat-<categoryId>": "…",     // capa de cada categoria
    "ig-1" … "ig-6": "…"         // grade do Instagram
  },
  "productImgs": { "5": ["…", "…"] }  // por produto: até 4 fotos; a 1ª é a principal
}
```

## Regras que o Hub deve seguir

1. **Dinheiro**: no banco do Hub, `price_cents integer` (regra dinheiro-pt-br). Campo de edição com R$ fixo, ponto de milhar ao digitar, vírgula com 2 casas; exibição só via `moeda()`. O JSON carrega `priceCents` — a conversão reais↔centavos fica no componente de campo, nunca espalhada.
2. **Imagens**: redimensionar no upload antes de gravar — produto ≤ 900px, categoria ≤ 800px, hero ≤ 1400px, fachada ≤ 1200px, Instagram ≤ 700px; JPEG qualidade ~0,82. São data-URLs: o peso entra direto no arquivo publicado.
3. **Publicação**: fluxo recomendado com o Hub como fonte da verdade:
   - banco do Hub → monta o objeto `data` → `injetarCatalogo(htmlAtual, data)` → publica o arquivo.
   - Guarde **o HTML atualmente publicado** (ou o último gerado) como base da injeção — é assim que o site ganha novas versões de design sem o Hub mudar nada.
4. **Importação inicial**: para popular o banco, rode `extrairCatalogo` no arquivo em produção uma única vez e migre os campos (mapa 1:1 com a tabela acima).
5. **Nunca** editar o JSON com regex/string no Hub fora do módulo, nem serializar sem o escape de `</` — é a diferença entre um site no ar e uma página em branco.
6. **Depoimentos**: o Hub deve manter o aviso — só publicar depoimento real com autorização por escrito.


## Site lendo o banco (bloco `__CG_REMOTE__`)

Além dos dados embutidos, o HTML tem um segundo bloco de marcadores:

```
const REMOTE = /*__CG_REMOTE__*/{"url":"","headers":{}}/*__CG_REMOTE_END__*/;
```

Comportamento do site:
1. Renderiza **imediatamente** com o `DATA` embutido (nada de tela em branco esperando rede).
2. Se `url` estiver preenchida, busca o catálogo publicado (timeout de 3,5 s, com os `headers` configurados — ex.: `apikey` anônima do Supabase) e, se a resposta for válida, atualiza a página em silêncio.
3. Qualquer falha (sem rede, 500, JSON fora do contrato) → segue com os dados embutidos. O arquivo embutido é a reserva oficial.

O endpoint deve devolver **o objeto do contrato acima, puro** (não embrulhado em `{data: …}`). No Supabase: view/RPC `site_catalogo_publicado` montando o JSON da última publicação, exposta com a chave anônima somente leitura. As fotos nesse JSON podem vir como URLs do storage — `validarCatalogo` e o site aceitam data-URL e `https://`.

O Hub preenche o bloco `__CG_REMOTE__` uma única vez (mesma técnica de substituição entre marcadores). O Painel standalone e o `injetarCatalogo` não tocam nesse bloco — só no `__CG_DATA__`.

**Publicar continua importante**: o fluxo do Card 04 (gerar arquivo com `DATA` atualizado) mantém a reserva embutida fresca; o banco dá a atualização instantânea entre publicações.

## O que acontece com o Painel standalone

Continua funcionando com qualquer versão do site que respeite o contrato — serve como fallback offline (ex.: cliente sem acesso ao Hub). Quando o Hub assumir, vocês decidem se o aposentam; nada quebra se os dois coexistirem, **desde que a edição parta sempre do arquivo mais recente publicado**.

## Checklist de aceite da integração no Hub

- [ ] Importar o site em produção → produtos/categorias/configurações aparecem no Hub sem perda
- [ ] Editar preço no Hub → arquivo gerado mostra o preço novo com `R$` e vírgula
- [ ] Criar produto com foto → aparece no site com a foto, e o pedido de WhatsApp o inclui
- [ ] `validarCatalogo` roda antes de toda publicação; dado inválido bloqueia com mensagem legível
- [ ] Depoimento contendo `</script>` publica sem quebrar a página
- [ ] Arquivo gerado abre offline e fecha um pedido completo no celular (360 px)
- [ ] Com `__CG_REMOTE__` preenchido e banco no ar → site mostra os dados do banco (preço alterado aparece sem republicar)
- [ ] Com banco fora do ar → site cai na reserva embutida sem erro no console
