/**
 * Lógica pura da função `marketing-ia` (card MK-3): sem rede, sem Deno.
 * Testada pelo Vitest em src/test/marketing-ia-logica.test.ts.
 *
 * Instruções fixas (manual de voz e regras por canal) vão com cache; por pedido vão só o briefing
 * e os textos da peça. A resposta vem por uma ferramenta com esquema fixo e é conferida aqui:
 * campo fora do formato é descartado e o motivo fica registrado.
 */

/** O modelo vem do banco (mkt_ia_preparar), junto com a reserva do custo. */
export const VERSAO_INSTRUCOES = "marketing-ia v2 · manual de voz de 27/10/2026 · modelos da marca";
/** Mesmos tetos de saída usados na reserva do banco (_mkt_ia_reserva). */
export const MAX_TOKENS: Record<Tipo, number> = { versao: 2000, ganchos: 600, revisao: 1200 };

export type Tipo = "versao" | "ganchos" | "revisao";
export const CHAMADAS = [
  "marcar_conversa",
  "falar_whatsapp",
  "quero_algo_assim",
  "agendar_diagnostico",
  "receber_artigos",
] as const;

/** Origens que podem chamar a função (mesma lista da função de reuniões). */
const ORIGENS = [
  /^https:\/\/spring-board-kit\.lovable\.app$/,
  /^https:\/\/([a-z0-9-]+\.)*foradopapel\.com\.br$/,
  /^http:\/\/(localhost|127\.0\.0\.1):[0-9]{2,5}$/,
];
export function origemPermitida(origem: string | null | undefined): origem is string {
  return typeof origem === "string" && ORIGENS.some((r) => r.test(origem));
}

// ---------------------------------------------------------------------
// Contexto que o banco devolve (mkt_ia_preparar)
// ---------------------------------------------------------------------
export type Contexto = {
  tenant_id: string;
  usuario: string | null;
  /** Linha reservada em ai_usage, fechada no registro. */
  uso_id: number;
  modelo: string;
  peca_id: string;
  versao_id: string;
  tipo: Tipo;
  briefing: {
    titulo: string;
    ideia: string | null;
    objetivo: string | null;
    funil: string | null;
    pilar: string | null;
    frente: string | null;
    publico: string | null;
    serie: string | null;
    direcao_arte: string | null;
    campanha: string | null;
    cliente: string | null;
  };
  versao: {
    canal: string;
    canal_nome: string | null;
    limite_texto: number | null;
    formato: string;
    gancho: string | null;
    texto: string | null;
    roteiro: { tempo: string; fala: string; na_tela: string }[];
    slides: { titulo: string; texto: string }[];
    chamada: string | null;
    hashtags: string | null;
  };
  outras: { canal: string; formato: string; gancho: string | null; texto: string }[];
};

// ---------------------------------------------------------------------
// Instruções fixas (resumo do manual de comunicação e da skill de conteúdo para redes)
// ---------------------------------------------------------------------
export const INSTRUCOES = `Você escreve conteúdo de redes sociais para a Fora do Papel, empresa que faz sistemas sob medida, sites que trazem contatos, automações e inteligência artificial aplicada com revisão humana. Você sugere; uma pessoa decide o que usar.

REGRA DE OURO: na dúvida, fale do problema do cliente, em português claro, e prometa só o que controlamos.

POSICIONAMENTO
- Topo do site: "Sistemas sob medida para empresas que cresceram mais rápido que as suas planilhas."
- A equipe trabalha num lugar só. Nunca prometer cancelar assinaturas, nem "tudo resolvido" ou "tudo garantido".
- O argumento é receita e capacidade (venda que não escapa, equipe que atende mais), nunca "sai mais barato".
- Quando uma ferramenta pronta resolve, dizemos isso: não dizer que sistema próprio é sempre melhor.
- Cliente definido pelo momento (cresceu mais rápido que as ferramentas), não pelo porte. Nunca "pequenas empresas" como rótulo único.

ESCRITA
- Problema, solução, tecnologia, nessa ordem. Uma ideia por frase; parágrafos de até três frases.
- Voz ativa. "Nós" para a empresa, "você" para o leitor. "A gente" pode nas redes.
- Português antes de inglês. Troque: lead → contato; call → conversa; pipeline → funil de vendas; deploy → colocar no ar; onboarding/kickoff → início do projeto; CRM sozinho → cadastro de clientes (CRM); SaaS/whitelabel → sistema com a sua marca.
- Nada inventado: nenhum número, preço, prazo, depoimento, cliente ou resultado que não esteja no briefing. Se faltar um dado, escreva um marcador em maiúsculas entre colchetes, como [PRAZO], e a pessoa preenche.
- Nunca preço, prazo fechado ou porte de empresa em post.
- No máximo uma exclamação e um emoji por peça. Sem "inovador", "disruptivo", "revolucionário".
- TUDO (palavra-assinatura) aparece no máximo uma vez por peça, em caixa alta, onde a promessa aparece. Frase principal: "TUDO o que você precisa, em um lugar só." Forma curta: "TUDO em um lugar só." ou "TUDO em um sistema só."
- Uma chamada só por peça, sempre uma destas: Marcar uma conversa, Falar no WhatsApp, Quero algo assim, Agendar um diagnóstico, Receber os próximos artigos.
- Projeto real só com o nome do cliente que vier no briefing (já autorizado); nomes de pessoas de exemplo e valores escondidos.
- Quem conduz os projetos não é tema: no máximo uma menção.

PILARES (o pilar vem no briefing)
- problema: a rotina que trava (WhatsApp de cada um, planilha, orçamento sem retorno).
- escolha_honesta: ferramenta pronta ou sistema, quando não contratar.
- projetos_reais: o que mudou na rotina do cliente, sem número inventado.
- como_trabalhamos: etapas, aprovações, dados do cliente, projeto entregue funcionando.
- bastidores: o Hub em uso, uma decisão de projeto explicada, sem jargão.
- chamada_direta: convite para a conversa de 30 minutos.

POR CANAL E FORMATO
- Instagram (@somosforadopapel): chamada para o link da bio. Carrossel de 3 a 8 slides: slide 1 com o problema ou uma pergunta que a pessoa se faz (sem curiosidade vazia nem urgência falsa), uma ideia por slide, lista com no máximo 4 itens, último slide com a chamada. Legenda que aprofunda (não resume): até 3 parágrafos curtos, uma pergunta para a pessoa pensar, 3 a 5 hashtags específicas (#aracaju quando fizer sentido).
- Modelos da marca (os slides viram imagem automaticamente): título do 1º slide (capa) com até 60 caracteres; título dos outros slides com até 40; texto de cada slide com até 220. O último slide do carrossel é a chamada final (o botão já traz as palavras da chamada; não repita).
- LinkedIn (página da empresa): o mesmo assunto com texto próprio. Primeira linha forte (aparece antes do "ver mais"), 4 a 8 linhas curtas, tom um pouco mais formal, sem emoji, até 3 hashtags, termina com a chamada e o link do site (não "link na bio"). Documento = slides do carrossel em PDF.
- Vídeo (Reels, TikTok, Shorts, vídeo): roteiro em blocos de até 5 segundos (tempo, fala, texto na tela); em cada bloco algo muda; 0 a 3 s: o problema em uma frase; legenda na tela sempre; fim com a chamada e @somosforadopapel.
- YouTube vídeo longo: roteiro em capítulos; título e descrição pensados para a busca.
- Stories: bastidores e enquetes curtas.
- Anúncio: uma promessa por variação.
- Cada canal ganha o seu texto: não repita o texto das outras versões da peça.`;

// ---------------------------------------------------------------------
// Pedido
// ---------------------------------------------------------------------
const textoSimples = { type: "string" } as const;

export function ferramenta(tipo: Tipo) {
  if (tipo === "versao")
    return {
      name: "sugerir_versao",
      description: "Devolve a versão sugerida para o canal e o formato pedidos.",
      input_schema: {
        type: "object",
        properties: {
          gancho: { type: "string", description: "O problema em uma frase (até 200 caracteres)." },
          texto: { type: "string", description: "Legenda, post ou descrição do canal." },
          roteiro: {
            type: "array",
            description: "Só para vídeo: blocos de até 5 s.",
            items: {
              type: "object",
              properties: { tempo: textoSimples, fala: textoSimples, na_tela: textoSimples },
              required: ["tempo", "fala", "na_tela"],
            },
          },
          slides: {
            type: "array",
            description: "Só para carrossel ou documento: de 3 a 8 slides.",
            items: {
              type: "object",
              properties: { titulo: textoSimples, texto: textoSimples },
              required: ["titulo", "texto"],
            },
          },
          chamada: { type: "string", enum: [...CHAMADAS] },
          hashtags: { type: "string" },
          observacao: {
            type: "string",
            description:
              "Uma frase para a pessoa: o que você escolheu e por quê, ou o dado que faltou.",
          },
        },
        required: ["gancho", "texto", "chamada", "observacao"],
      },
    };
  if (tipo === "ganchos")
    return {
      name: "sugerir_ganchos",
      description: "Devolve 5 ganchos diferentes para a versão.",
      input_schema: {
        type: "object",
        properties: { ganchos: { type: "array", items: textoSimples, minItems: 5, maxItems: 5 } },
        required: ["ganchos"],
      },
    };
  return {
    name: "revisar_pela_voz",
    description:
      "Aponta trechos do gancho ou do texto que fogem do manual e propõe a troca. O trecho é copiado exatamente do campo indicado e precisa aparecer uma vez só nele.",
    input_schema: {
      type: "object",
      properties: {
        itens: {
          type: "array",
          maxItems: 8,
          items: {
            type: "object",
            properties: {
              campo: { type: "string", enum: ["gancho", "texto"] },
              trecho: textoSimples,
              problema: textoSimples,
              troca: textoSimples,
            },
            required: ["campo", "trecho", "problema", "troca"],
          },
        },
        resumo: { type: "string", description: "Uma frase sobre o texto como um todo." },
      },
      required: ["itens", "resumo"],
    },
  };
}

const ehVideo = (f: string) =>
  ["reels", "video", "video_curto", "shorts", "video_longo", "stories", "anuncio"].includes(f);
const ehSlides = (f: string) => ["carrossel", "documento", "carrossel_fotos"].includes(f);

/** Mensagem do pedido: só o briefing e os textos da peça. */
export function mensagemDoPedido(c: Contexto): string {
  const v = c.versao;
  const linhas = [
    `CANAL: ${v.canal_nome ?? v.canal} · FORMATO: ${v.formato} · LIMITE DO TEXTO: ${v.limite_texto ?? 2200} caracteres`,
    "",
    "BRIEFING",
    JSON.stringify(c.briefing),
  ];
  if (c.tipo === "versao") {
    linhas.push(
      "",
      ehVideo(v.formato)
        ? "Escreva gancho, roteiro (blocos de até 5 s), texto da legenda, chamada e hashtags."
        : ehSlides(v.formato)
          ? "Escreva gancho, slides (3 a 8), texto da legenda, chamada e hashtags."
          : "Escreva gancho, texto, chamada e hashtags.",
    );
    if (c.outras.length > 0)
      linhas.push(
        "",
        "OUTRAS VERSÕES DA PEÇA (não repita o texto delas)",
        JSON.stringify(c.outras),
      );
    if (v.texto || v.gancho)
      linhas.push(
        "",
        "TEXTO ATUAL DESTA VERSÃO (pode melhorar)",
        JSON.stringify({ gancho: v.gancho, texto: v.texto }),
      );
  } else if (c.tipo === "ganchos") {
    linhas.push(
      "",
      "Escreva 5 ganchos diferentes entre si (até 200 caracteres cada) para esta versão.",
    );
    if (v.gancho) linhas.push(`Gancho atual: ${v.gancho}`);
  } else {
    linhas.push(
      "",
      "Revise o gancho e o texto abaixo pelo manual. Diga o campo de cada trecho e copie o trecho exatamente como está, com contexto suficiente para aparecer uma vez só. Só aponte o que fere o manual; se estiver bom, devolva a lista vazia.",
      JSON.stringify({ gancho: v.gancho, texto: v.texto }),
    );
  }
  return linhas.join("\n");
}

/** Corpo do pedido à API de Mensagens. As instruções fixas vão com cache. */
export function corpoDoPedido(c: Contexto) {
  const f = ferramenta(c.tipo);
  return {
    model: c.modelo,
    max_tokens: MAX_TOKENS[c.tipo],
    system: [{ type: "text", text: INSTRUCOES, cache_control: { type: "ephemeral" } }],
    tools: [f],
    tool_choice: { type: "tool", name: f.name },
    messages: [{ role: "user", content: mensagemDoPedido(c) }],
  };
}

// ---------------------------------------------------------------------
// Resposta
// ---------------------------------------------------------------------
/** Campos que a ferramenta pode devolver (e que a sugestão guarda). */
export type EntradaIA = Partial<
  Record<
    | "gancho"
    | "texto"
    | "roteiro"
    | "slides"
    | "chamada"
    | "hashtags"
    | "observacao"
    | "ganchos"
    | "itens"
    | "resumo",
    unknown
  >
>;
type Item = Partial<
  Record<
    "tempo" | "fala" | "na_tela" | "titulo" | "texto" | "campo" | "trecho" | "problema" | "troca",
    unknown
  >
>;
type UsoBruto = Partial<
  Record<
    "input_tokens" | "output_tokens" | "cache_creation_input_tokens" | "cache_read_input_tokens",
    unknown
  >
>;
export type Uso = { entrada: number; saida: number; cache_escrita: number; cache_leitura: number };

export function usoDaResposta(r: unknown): Uso {
  const u: UsoBruto = (r as { usage?: UsoBruto } | null)?.usage ?? {};
  const n = (x: unknown) => (typeof x === "number" && x >= 0 ? Math.floor(x) : 0);
  return {
    entrada: n(u.input_tokens),
    saida: n(u.output_tokens),
    cache_escrita: n(u.cache_creation_input_tokens),
    cache_leitura: n(u.cache_read_input_tokens),
  };
}

/** O que a ferramenta devolveu (ou null se a resposta não trouxe a ferramenta). */
export function entradaDaFerramenta(r: unknown, tipo: Tipo): EntradaIA | null {
  const nome = ferramenta(tipo).name;
  const blocos = (r as { content?: unknown[] } | null)?.content;
  if (!Array.isArray(blocos)) return null;
  for (const b of blocos) {
    const x = b as { type?: string; name?: string; input?: unknown };
    if (x.type === "tool_use" && x.name === nome && x.input && typeof x.input === "object")
      return x.input as EntradaIA;
  }
  return null;
}

const corta = (x: unknown, max: number): string | null =>
  typeof x === "string" && x.trim() ? x.trim().slice(0, max) : null;

export type Validado = { conteudo: EntradaIA; descartados: string[] };

/**
 * Confere a resposta: tamanho, formato e lista de chamadas. O que não passa sai e fica no motivo.
 * Na revisão, só fica o trecho que existe no texto atual (senão a troca não teria onde entrar).
 */
export function validar(tipo: Tipo, e: EntradaIA, c: Contexto): Validado | null {
  const descartados: string[] = [];
  const v = c.versao;
  if (tipo === "versao") {
    const out: EntradaIA = {};
    const gancho = corta(e.gancho, 200);
    const texto = corta(e.texto, v.limite_texto ?? 2200);
    if (gancho) out.gancho = gancho;
    else descartados.push("gancho");
    if (texto) out.texto = texto;
    else descartados.push("texto");
    if (typeof e.texto === "string" && e.texto.trim().length > (v.limite_texto ?? 2200))
      descartados.push("texto cortado no limite do canal");
    if (ehVideo(v.formato)) {
      const r = (Array.isArray(e.roteiro) ? e.roteiro : [])
        .filter((x): x is Item => !!x && typeof x === "object")
        .slice(0, 60)
        .map((x) => ({
          tempo: corta(x.tempo, 20) ?? "",
          fala: corta(x.fala, 600) ?? "",
          na_tela: corta(x.na_tela, 300) ?? "",
        }))
        .filter((x) => x.fala || x.na_tela);
      if (r.length > 0) out.roteiro = r;
      else descartados.push("roteiro");
    }
    if (ehSlides(v.formato)) {
      // Carrossel do manual: de 3 a 8 slides. Passou de 8, ficam os 8 primeiros.
      const s = (Array.isArray(e.slides) ? e.slides : [])
        .filter((x): x is Item => !!x && typeof x === "object")
        .map((x) => ({ titulo: corta(x.titulo, 120) ?? "", texto: corta(x.texto, 600) ?? "" }))
        .filter((x) => x.titulo || x.texto);
      if (s.length < 3) descartados.push("slides (menos de 3)");
      else {
        out.slides = s.slice(0, 8);
        if (s.length > 8) descartados.push(`${s.length - 8} slide(s) além do 8º`);
      }
    }
    if (typeof e.chamada === "string" && (CHAMADAS as readonly string[]).includes(e.chamada))
      out.chamada = e.chamada;
    else descartados.push("chamada fora do manual");
    const h = corta(e.hashtags, 300);
    if (h) out.hashtags = h;
    const obs = corta(e.observacao, 400);
    if (obs) out.observacao = obs;
    if (!out.gancho && !out.texto) return null;
    return { conteudo: out, descartados };
  }
  if (tipo === "ganchos") {
    const g = (Array.isArray(e.ganchos) ? e.ganchos : [])
      .map((x) => corta(x, 200))
      .filter((x): x is string => !!x);
    const unicos = [...new Set(g)].slice(0, 5);
    if (unicos.length === 0) return null;
    if (unicos.length < 5)
      descartados.push(`${5 - unicos.length} gancho(s) vazio(s) ou repetido(s)`);
    return { conteudo: { ganchos: unicos }, descartados };
  }
  const itens = (Array.isArray(e.itens) ? e.itens : [])
    .filter((x): x is Item => !!x && typeof x === "object")
    .slice(0, 8)
    .map((x) => ({
      campo: x.campo === "gancho" ? ("gancho" as const) : ("texto" as const),
      trecho: typeof x.trecho === "string" ? x.trecho.slice(0, 400) : "",
      problema: corta(x.problema, 300) ?? "",
      troca: typeof x.troca === "string" ? x.troca.slice(0, 400) : "",
    }));
  // A troca só entra se o trecho aparece uma vez no campo (a mesma regra do banco ao usar).
  const vezes = (campo: string, t: string) => campo.split(t).length - 1;
  const bons = itens.filter(
    (x) =>
      x.trecho.length >= 2 &&
      x.problema &&
      vezes(x.campo === "gancho" ? (v.gancho ?? "") : (v.texto ?? ""), x.trecho) === 1,
  );
  if (bons.length < itens.length)
    descartados.push(
      `${itens.length - bons.length} trecho(s) que não estão no campo ou aparecem mais de uma vez`,
    );
  return { conteudo: { itens: bons, resumo: corta(e.resumo, 400) ?? "" }, descartados };
}

/** Base da sugestão, para a tela dizer de onde ela veio (regra 6). */
export function baseDaSugestao(c: Contexto, descartados: string[]) {
  return {
    instrucoes: VERSAO_INSTRUCOES,
    modelo: c.modelo,
    usou: [
      "ideia central",
      "briefing",
      ...(c.outras.length > 0 && c.tipo === "versao" ? ["outras versões da peça"] : []),
      ...(c.tipo !== "ganchos" && (c.versao.texto || c.versao.gancho)
        ? ["texto atual da versão"]
        : []),
    ],
    descartados,
  };
}

// ---------------------------------------------------------------------
// Servidor
// ---------------------------------------------------------------------
export const API_ANTHROPIC = "https://api.anthropic.com/v1/messages";

/**
 * Endereço da API. A troca (servidor falso) só vale com o Supabase local: em produção a chave
 * nunca vai para outro endereço, mesmo que a variável seja copiada por engano.
 */
export function enderecoDaIA(supabaseUrl: string, troca: string | undefined): string {
  const local = /^http:\/\/(kong:8000|127\.0\.0\.1:[0-9]+|localhost:[0-9]+)$/.test(supabaseUrl);
  return local && troca ? troca : API_ANTHROPIC;
}

/** Erros do banco que a tela sabe explicar. O resto vira "falha" (sem detalhe interno). */
const ERROS_PUBLICOS = [
  "teto_mensal",
  "limite_diario",
  "briefing_incompleto",
  "sem_texto_para_revisar",
  "tipo_invalido",
  "versao_inexistente",
  "versao_publicada",
  "preco_do_modelo",
  "sem_permissao",
  "precisa_codigo",
] as const;
export function erroPublico(mensagem: string): string {
  return ERROS_PUBLICOS.find((e) => mensagem.includes(e)) ?? "falha";
}
