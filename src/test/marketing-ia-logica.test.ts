import { describe, expect, it } from "vitest";

import {
  baseDaSugestao,
  type Contexto,
  corpoDoPedido,
  enderecoDaIA,
  entradaDaFerramenta,
  erroPublico,
  INSTRUCOES,
  mensagemDoPedido,
  origemPermitida,
  usoDaResposta,
  validar,
} from "../../supabase/functions/marketing-ia/logica";

function contexto(
  extra: Partial<Contexto> = {},
  versao: Partial<Contexto["versao"]> = {},
): Contexto {
  return {
    tenant_id: "t",
    usuario: "u",
    uso_id: 1,
    modelo: "claude-sonnet-5-5",
    peca_id: "p",
    versao_id: "v",
    tipo: "versao",
    briefing: {
      titulo: "Planilha que trava",
      ideia: "A planilha cresce e ninguém acha a versão certa.",
      objetivo: "conversa",
      funil: "descoberta",
      pilar: "problema",
      frente: null,
      publico: null,
      serie: null,
      direcao_arte: null,
      campanha: null,
      cliente: null,
    },
    versao: {
      canal: "instagram",
      canal_nome: "Instagram",
      limite_texto: 2200,
      formato: "carrossel",
      gancho: null,
      texto: null,
      roteiro: [],
      slides: [],
      chamada: null,
      hashtags: null,
      ...versao,
    },
    outras: [],
    ...extra,
  };
}

const slides = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ titulo: `S${i + 1}`, texto: "t" }));

describe("pedido à IA", () => {
  it("usa o Sonnet, instruções fixas com cache e a ferramenta forçada", () => {
    const c = corpoDoPedido(contexto());
    expect(c.model).toBe("claude-sonnet-5-5");
    expect(c.system[0]?.cache_control).toEqual({ type: "ephemeral" });
    expect(c.system[0]?.text).toBe(INSTRUCOES);
    expect(c.tool_choice).toEqual({ type: "tool", name: "sugerir_versao" });
    expect(c.tools[0]?.name).toBe("sugerir_versao");
  });

  it("manda só o briefing e os textos da peça, e pede slides para carrossel", () => {
    const m = mensagemDoPedido(contexto());
    expect(m).toContain("A planilha cresce");
    expect(m).toContain("slides (3 a 8)");
    expect(m).not.toContain("OUTRAS VERSÕES");
  });

  it("pede roteiro para vídeo e mostra as outras versões para não repetir", () => {
    const m = mensagemDoPedido(
      contexto(
        { outras: [{ canal: "linkedin", formato: "texto", gancho: "g", texto: "t" }] },
        { formato: "reels" },
      ),
    );
    expect(m).toContain("roteiro");
    expect(m).toContain("OUTRAS VERSÕES");
  });

  it("instruções trazem as regras que mais custam caro errar", () => {
    expect(INSTRUCOES).toContain("Nada inventado");
    expect(INSTRUCOES).toContain("Uma chamada só por peça");
    expect(INSTRUCOES).toContain("[PRAZO]");
  });
});

describe("resposta da IA", () => {
  it("lê os tokens, inclusive de cache", () => {
    expect(
      usoDaResposta({
        usage: {
          input_tokens: 10,
          output_tokens: 5,
          cache_creation_input_tokens: 3,
          cache_read_input_tokens: 7,
        },
      }),
    ).toEqual({ entrada: 10, saida: 5, cache_escrita: 3, cache_leitura: 7 });
    expect(usoDaResposta(null)).toEqual({
      entrada: 0,
      saida: 0,
      cache_escrita: 0,
      cache_leitura: 0,
    });
  });

  it("acha a ferramenta certa e ignora outras", () => {
    const r = {
      content: [
        { type: "text", text: "oi" },
        { type: "tool_use", name: "outra", input: { x: 1 } },
        { type: "tool_use", name: "sugerir_ganchos", input: { ganchos: ["a"] } },
      ],
    };
    expect(entradaDaFerramenta(r, "ganchos")).toEqual({ ganchos: ["a"] });
    expect(entradaDaFerramenta(r, "versao")).toBeNull();
    expect(entradaDaFerramenta({}, "versao")).toBeNull();
  });
});

describe("validação", () => {
  it("versão de carrossel com 3 a 8 slides e chamada da lista passa inteira", () => {
    const v = validar(
      "versao",
      {
        gancho: "G",
        texto: "T",
        slides: slides(5),
        chamada: "marcar_conversa",
        hashtags: "#a",
        observacao: "ok",
      },
      contexto(),
    );
    expect(v?.descartados).toEqual([]);
    expect(v?.conteudo).toMatchObject({ gancho: "G", texto: "T", chamada: "marcar_conversa" });
    expect((v?.conteudo.slides as unknown[]).length).toBe(5);
  });

  it("chamada fora do manual e menos de 3 slides são descartados com o motivo", () => {
    const v = validar(
      "versao",
      { gancho: "G", texto: "T", slides: slides(2), chamada: "compre_agora" },
      contexto(),
    );
    expect(v?.conteudo.chamada).toBeUndefined();
    expect(v?.conteudo.slides).toBeUndefined();
    expect(v?.descartados).toEqual(["slides (menos de 3)", "chamada fora do manual"]);
  });

  it("texto acima do limite do canal é cortado e avisado", () => {
    const v = validar(
      "versao",
      { gancho: "G", texto: "x".repeat(50), chamada: "falar_whatsapp" },
      contexto({}, { limite_texto: 20, formato: "post_unico" }),
    );
    expect((v?.conteudo.texto as string).length).toBe(20);
    expect(v?.descartados).toContain("texto cortado no limite do canal");
  });

  it("roteiro só entra em vídeo", () => {
    const roteiro = [{ tempo: "0-3", fala: "Sua planilha travou?", na_tela: "PLANILHA" }];
    expect(
      validar("versao", { gancho: "G", texto: "T", roteiro, chamada: "x" }, contexto())?.conteudo
        .roteiro,
    ).toBeUndefined();
    expect(
      validar(
        "versao",
        { gancho: "G", texto: "T", roteiro, chamada: "x" },
        contexto({}, { formato: "reels" }),
      )?.conteudo.roteiro,
    ).toEqual(roteiro);
  });

  it("sem gancho nem texto não vira sugestão", () => {
    expect(validar("versao", { chamada: "marcar_conversa" }, contexto())).toBeNull();
  });

  it("ganchos: vazios e repetidos saem; até 5", () => {
    const v = validar("ganchos", { ganchos: ["A", "A", " ", "B", "C", "D", "E", "F"] }, contexto());
    expect(v?.conteudo.ganchos).toEqual(["A", "B", "C", "D", "E"]);
    expect(validar("ganchos", { ganchos: [] }, contexto())).toBeNull();
  });

  it("revisão só guarda trecho que aparece uma vez no campo apontado", () => {
    const c = contexto(
      { tipo: "revisao" },
      { gancho: "Revolucionário e inovador", texto: "Nosso CRM inovador. Um sistema, um sistema." },
    );
    const v = validar(
      "revisao",
      {
        itens: [
          {
            campo: "texto",
            trecho: "CRM inovador",
            problema: "Palavra vazia",
            troca: "cadastro de clientes",
          },
          { campo: "gancho", trecho: "Revolucionário", problema: "Palavra vazia", troca: "Feito" },
          { campo: "texto", trecho: "inexistente", problema: "x", troca: "y" },
          { campo: "texto", trecho: "sistema", problema: "repete", troca: "y" },
          { campo: "gancho", trecho: "Nosso", problema: "campo errado", troca: "y" },
        ],
        resumo: "Começa pela ferramenta.",
      },
      c,
    );
    expect(v?.conteudo.itens).toEqual([
      {
        campo: "texto",
        trecho: "CRM inovador",
        problema: "Palavra vazia",
        troca: "cadastro de clientes",
      },
      { campo: "gancho", trecho: "Revolucionário", problema: "Palavra vazia", troca: "Feito" },
    ]);
    expect(v?.descartados).toEqual([
      "3 trecho(s) que não estão no campo ou aparecem mais de uma vez",
    ]);
  });

  it("carrossel: mais de 8 slides fica nos 8 primeiros; sem slides, avisa", () => {
    const muitos = validar(
      "versao",
      { gancho: "G", texto: "T", slides: slides(10), chamada: "marcar_conversa" },
      contexto(),
    );
    expect((muitos?.conteudo.slides as unknown[]).length).toBe(8);
    expect(muitos?.descartados).toContain("2 slide(s) além do 8º");
    const sem = validar(
      "versao",
      { gancho: "G", texto: "T", chamada: "marcar_conversa" },
      contexto(),
    );
    expect(sem?.descartados).toContain("slides (menos de 3)");
  });

  it("vídeo sem roteiro avisa o que faltou", () => {
    const v = validar(
      "versao",
      { gancho: "G", texto: "T", chamada: "marcar_conversa" },
      contexto({}, { formato: "reels" }),
    );
    expect(v?.descartados).toContain("roteiro");
  });
});

describe("servidor", () => {
  it("a troca do endereço da IA só vale no Supabase local", () => {
    expect(enderecoDaIA("http://kong:8000", "http://host.docker.internal:8787/v1/messages")).toBe(
      "http://host.docker.internal:8787/v1/messages",
    );
    expect(enderecoDaIA("https://abc.supabase.co", "https://webhook.site/x")).toBe(
      "https://api.anthropic.com/v1/messages",
    );
    expect(enderecoDaIA("http://kong:8000", undefined)).toBe(
      "https://api.anthropic.com/v1/messages",
    );
  });

  it("só erros conhecidos chegam ao navegador", () => {
    expect(erroPublico("teto_mensal")).toBe("teto_mensal");
    expect(erroPublico("permission denied for function mkt_ia_registrar")).toBe("falha");
    expect(erroPublico('duplicate key value violates unique constraint "x"')).toBe("falha");
  });
});

describe("base e origem", () => {
  it("base diz o que foi usado e o que saiu", () => {
    const b = baseDaSugestao(
      contexto({ outras: [{ canal: "x", formato: "y", gancho: null, texto: "" }] }),
      ["chamada fora do manual"],
    );
    expect(b.usou).toEqual(["ideia central", "briefing", "outras versões da peça"]);
    expect(b.descartados).toEqual(["chamada fora do manual"]);
    expect(b.instrucoes).toContain("manual de voz");
  });

  it("só aceita as origens do Hub", () => {
    expect(origemPermitida("https://spring-board-kit.lovable.app")).toBe(true);
    expect(origemPermitida("https://hub.foradopapel.com.br")).toBe(true);
    expect(origemPermitida("https://evil.com")).toBe(false);
    expect(origemPermitida(null)).toBe(false);
  });
});
