/**
 * Catálogo CG Moda Masculina — leitura e escrita do bloco de dados do site.
 *
 * O site é um HTML único com os dados embutidos entre dois marcadores:
 *   const DATA = /*__CG_DATA__*\/{ ...json... }/*__CG_DATA_END__*\/;
 *
 * Este módulo é a ÚNICA porta de entrada/saída recomendada:
 *   - extrairCatalogo(html)        → { data, meta }
 *   - injetarCatalogo(html, data)  → html novo (valida antes de escrever)
 *   - validarCatalogo(data)        → lista de erros ('' = ok)
 *
 * Regras herdadas do projeto (ver INTEGRACAO-CATALOGO-CG.md):
 *   - Preço SEMPRE em centavos inteiros (priceCents). No banco: price_cents integer.
 *   - Ao serializar, "</" vira "<\/" para o JSON não fechar a tag <script>.
 *   - Imagens são data-URLs JPEG já redimensionadas (produto ≤900px, categoria ≤800px,
 *     hero ≤1400px, instagram ≤700px, qualidade ~0.82).
 */

const MARCA_INICIO = '/*__CG_DATA__*/';
const MARCA_FIM = '/*__CG_DATA_END__*/';

/** Selos válidos de produto. */
export const SELOS = ['novo', 'mais-vendido', 'promo'];

/**
 * @typedef {Object} Produto
 * @property {number} id            Inteiro único no catálogo.
 * @property {string} name
 * @property {string} category      Deve existir em categories[].id.
 * @property {string} brand
 * @property {number} priceCents    Centavos, inteiro > 0. NUNCA float de reais.
 * @property {string[]} sizes       Ao menos 1 (ex.: ["P","M","G"] ou ["38","40"]).
 * @property {{n: string, h: string}[]} colors  Ao menos 1; h = hex (#rrggbb).
 * @property {('novo'|'mais-vendido'|'promo'|null)} badge
 * @property {number} [promoPct]    Obrigatório (1–90) quando badge === 'promo'.
 */

/**
 * @typedef {Object} Catalogo
 * @property {{whatsappNumber: string, showPromoBanner: boolean, address: string,
 *             hours: string, instagram: string}} config
 * @property {{id: string, name: string}[]} categories
 * @property {Produto[]} products
 * @property {{quote: string, author: string}[]} testimonials
 * @property {string[]} brands
 * @property {Record<string, string>} img         Fotos fixas: hero, fachada,
 *                                                cat-<categoryId>, ig-1 … ig-6.
 * @property {Record<string, string[]>} productImgs  productId → até 4 data-URLs;
 *                                                   a primeira é a foto principal.
 */

/**
 * Extrai o catálogo de um HTML do site.
 * @param {string} html
 * @returns {{data: Catalogo, meta: {inicio: number, fim: number}}}
 * @throws {Error} se os marcadores não existirem ou o JSON for inválido.
 */
export function extrairCatalogo(html) {
  const a = html.indexOf(MARCA_INICIO);
  const b = html.indexOf(MARCA_FIM);
  if (a < 0 || b < 0 || b <= a) {
    throw new Error('Marcadores __CG_DATA__ não encontrados: este arquivo não é o catálogo da CG (ou foi alterado fora do contrato).');
  }
  const bruto = html.slice(a + MARCA_INICIO.length, b);
  let data;
  try {
    data = JSON.parse(bruto);
  } catch (e) {
    throw new Error('Bloco de dados ilegível (JSON inválido): ' + e.message);
  }
  data.productImgs = data.productImgs || {};
  return { data, meta: { inicio: a, fim: b } };
}

/**
 * Injeta um catálogo (já validado) num HTML do site e devolve o HTML novo.
 * Sempre injete sobre a VERSÃO ATUAL do site publicado, nunca sobre um template antigo.
 * @param {string} html  HTML atual do site (com marcadores).
 * @param {Catalogo} data
 * @returns {string}
 * @throws {Error} se a validação falhar — nada é escrito com dado inválido.
 */
export function injetarCatalogo(html, data) {
  const erros = validarCatalogo(data);
  if (erros.length) {
    throw new Error('Catálogo inválido:\n- ' + erros.join('\n- '));
  }
  const a = html.indexOf(MARCA_INICIO);
  const b = html.indexOf(MARCA_FIM);
  if (a < 0 || b < 0 || b <= a) {
    throw new Error('Marcadores __CG_DATA__ não encontrados no HTML de destino.');
  }
  const json = JSON.stringify(data).replace(/<\//g, '<\\/'); // não fechar o <script>
  return html.slice(0, a + MARCA_INICIO.length) + json + html.slice(b);
}

/**
 * Valida o catálogo. Devolve a lista de erros (vazia = ok).
 * @param {Catalogo} data
 * @returns {string[]}
 */
export function validarCatalogo(data) {
  const erros = [];
  const ehImagem = (s) => typeof s === 'string' && (/^data:image\/(jpeg|png|webp);base64,/.test(s) || /^https:\/\/\S+$/.test(s));

  if (!data || typeof data !== 'object') return ['dados ausentes'];

  // config
  const c = data.config || {};
  if (!/^\+?[\d\s()-]{10,}$/.test(String(c.whatsappNumber || ''))) erros.push('config.whatsappNumber inválido (use +55 DDD número)');
  if (typeof c.showPromoBanner !== 'boolean') erros.push('config.showPromoBanner deve ser boolean');
  for (const k of ['address', 'hours', 'instagram']) {
    if (!String(c[k] || '').trim()) erros.push(`config.${k} vazio`);
  }

  // categorias
  if (!Array.isArray(data.categories) || !data.categories.length) erros.push('categories vazio');
  const catIds = new Set();
  for (const cat of data.categories || []) {
    if (!/^[a-z0-9-]+$/.test(cat.id || '')) erros.push(`categoria com id inválido: "${cat.id}" (use letras minúsculas, números e hífen)`);
    if (catIds.has(cat.id)) erros.push(`categoria duplicada: ${cat.id}`);
    catIds.add(cat.id);
    if (!String(cat.name || '').trim()) erros.push(`categoria ${cat.id} sem nome`);
  }

  // produtos
  if (!Array.isArray(data.products)) erros.push('products ausente');
  const prodIds = new Set();
  for (const p of data.products || []) {
    const rot = `produto "${p.name || p.id}"`;
    if (!Number.isInteger(p.id)) erros.push(`${rot}: id deve ser inteiro`);
    if (prodIds.has(p.id)) erros.push(`${rot}: id duplicado (${p.id})`);
    prodIds.add(p.id);
    if (!String(p.name || '').trim()) erros.push(`produto ${p.id} sem nome`);
    if (!catIds.has(p.category)) erros.push(`${rot}: categoria inexistente (${p.category})`);
    if (!Number.isInteger(p.priceCents) || p.priceCents <= 0) erros.push(`${rot}: priceCents deve ser inteiro de centavos > 0 (veio ${JSON.stringify(p.priceCents)})`);
    if (!Array.isArray(p.sizes) || !p.sizes.length) erros.push(`${rot}: ao menos 1 tamanho`);
    if (!Array.isArray(p.colors) || !p.colors.length) erros.push(`${rot}: ao menos 1 cor`);
    for (const cor of p.colors || []) {
      if (!String(cor.n || '').trim() || !/^#[0-9a-fA-F]{6}$/.test(cor.h || '')) erros.push(`${rot}: cor inválida (${JSON.stringify(cor)})`);
    }
    if (p.badge != null && !SELOS.includes(p.badge)) erros.push(`${rot}: badge inválido (${p.badge})`);
    if (p.badge === 'promo' && !(Number.isInteger(p.promoPct) && p.promoPct >= 1 && p.promoPct <= 90)) {
      erros.push(`${rot}: promoPct obrigatório (1–90) quando badge é "promo"`);
    }
  }

  // depoimentos e marcas
  for (const t of data.testimonials || []) {
    if (!String(t.quote || '').trim() || !String(t.author || '').trim()) erros.push('depoimento sem texto ou sem autor');
  }
  if (!Array.isArray(data.brands)) erros.push('brands ausente');

  // imagens
  const img = data.img || {};
  for (const k of ['hero', 'fachada', 'ig-1', 'ig-2', 'ig-3', 'ig-4', 'ig-5', 'ig-6']) {
    if (img[k] && !ehImagem(img[k])) erros.push(`img.${k} não é imagem válida (data-URL ou URL https)`);
  }
  for (const [pid, fotos] of Object.entries(data.productImgs || {})) {
    if (!prodIds.has(Number(pid))) erros.push(`productImgs: produto ${pid} não existe`);
    if (!Array.isArray(fotos) || fotos.length > 4) erros.push(`productImgs[${pid}]: lista de até 4 fotos`);
    for (const f of fotos || []) if (!ehImagem(f)) erros.push(`productImgs[${pid}]: foto não é imagem válida (data-URL ou URL https)`);
  }

  return erros;
}

/** Formatação única de dinheiro (exibição no Hub). */
export const moeda = (cents) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
