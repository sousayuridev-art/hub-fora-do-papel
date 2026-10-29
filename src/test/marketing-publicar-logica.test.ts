import { describe, expect, it } from "vitest";

import {
  acharPost,
  ErroPedido,
  traduzirErro,
  esperouDemais,
  lerNumeros,
  lerSituacao,
  montarPedido,
  type Pacote,
} from "../../supabase/functions/marketing-publicar/logica";

const arq = (papel: string, n = 1) => ({
  papel,
  caminho: `t/redes/${papel}${n}`,
  mime: "image/png",
  nome: `${papel}${n}.png`,
});
function pacote(extra: Partial<Pacote> = {}): Pacote {
  return {
    versao_id: "v",
    perfil: "fora-do-papel",
    pagina_linkedin: "123",
    canal: "instagram",
    formato: "carrossel",
    titulo: "A planilha cresceu.",
    legenda: "Toda empresa começa numa planilha.\n\n#gestao",
    link: "https://www.foradopapel.com.br/?utm_content=ABC234",
    arquivos: [arq("slide", 1), arq("slide", 2)],
    ...extra,
  };
}
const campo = (p: { campos: [string, string][] }, k: string) =>
  p.campos.filter(([n]) => n === k).map(([, v]) => v);

describe("pedido ao Upload-Post", () => {
  it("carrossel do Instagram: fotos em arquivo, na ordem, com a legenda", () => {
    const p = montarPedido(pacote());
    expect(p.caminho).toBe("/upload_photos");
    expect(campo(p, "platform[]")).toEqual(["instagram"]);
    expect(campo(p, "user")).toEqual(["fora-do-papel"]);
    expect(campo(p, "title")).toEqual(["Toda empresa começa numa planilha.\n\n#gestao"]);
    expect(p.anexos.map((a) => a.caminho)).toEqual(["t/redes/slide1", "t/redes/slide2"]);
    expect(campo(p, "async_upload")).toEqual(["true"]);
  });

  it("Stories marca o tipo; mais de 10 fotos no Instagram é recusado", () => {
    expect(
      campo(montarPedido(pacote({ formato: "stories", arquivos: [arq("imagem")] })), "media_type"),
    ).toEqual(["STORIES"]);
    const muitas = Array.from({ length: 11 }, (_, i) => arq("slide", i));
    expect(() => montarPedido(pacote({ arquivos: muitas }))).toThrow(ErroPedido);
  });

  it("Reels: vídeo e capa por link assinado", () => {
    const p = montarPedido(pacote({ formato: "reels", arquivos: [arq("video"), arq("capa")] }));
    expect(p.caminho).toBe("/upload");
    expect(p.links).toEqual([
      { campo: "video", caminho: "t/redes/video1" },
      { campo: "cover_url", caminho: "t/redes/capa1" },
    ]);
  });

  it("YouTube: título curto e a legenda (com link) na descrição", () => {
    const p = montarPedido(
      pacote({ canal: "youtube", formato: "shorts", arquivos: [arq("video")] }),
    );
    expect(campo(p, "title")).toEqual(["A planilha cresceu."]);
    expect(campo(p, "description")[0]).toContain("planilha");
  });

  it("LinkedIn: texto, documento e página da empresa", () => {
    const t = montarPedido(pacote({ canal: "linkedin", formato: "texto", arquivos: [] }));
    expect(t.caminho).toBe("/upload_text");
    expect(campo(t, "target_linkedin_page_id")).toEqual(["123"]);
    const d = montarPedido(
      pacote({ canal: "linkedin", formato: "documento", arquivos: [arq("documento")] }),
    );
    expect(d.caminho).toBe("/upload_document");
    expect(d.links).toEqual([{ campo: "document", caminho: "t/redes/documento1" }]);
  });

  it("TikTok: carrossel de fotos público", () => {
    const p = montarPedido(pacote({ canal: "tiktok", formato: "carrossel_fotos" }));
    expect(campo(p, "privacy_level")).toEqual(["PUBLIC_TO_EVERYONE"]);
    expect(campo(p, "tiktok_description")[0]).toContain("planilha");
  });

  it("sem o arquivo exigido: erro claro (vira 'Não saiu' na tela)", () => {
    expect(() => montarPedido(pacote({ arquivos: [] }))).toThrow("Falta a imagem da versão.");
    expect(() => montarPedido(pacote({ formato: "reels", arquivos: [] }))).toThrow(
      "Falta o vídeo da versão.",
    );
  });
});

describe("erros em português", () => {
  it("conta desconectada, limite e chave", () => {
    expect(traduzirErro("Token expired, please reconnect")).toMatch(/desconectada/);
    expect(traduzirErro("Daily limit reached", 429)).toMatch(/limite/);
    expect(traduzirErro("Invalid API key", 401)).toMatch(/chave do Upload-Post/);
    expect(traduzirErro("Something odd")).toBe(
      "A rede não aceitou a publicação. Detalhe: Something odd",
    );
  });

  it("vídeo do TikTok e do LinkedIn, capa do YouTube longo e anúncio sem caminho", () => {
    const tk = montarPedido(
      pacote({ canal: "tiktok", formato: "video", arquivos: [arq("video")] }),
    );
    expect(campo(tk, "tiktok_title")[0]).toContain("planilha");
    const li = montarPedido(
      pacote({ canal: "linkedin", formato: "video", arquivos: [arq("video")] }),
    );
    expect(campo(li, "target_linkedin_page_id")).toEqual(["123"]);
    const yt = montarPedido(
      pacote({ canal: "youtube", formato: "video_longo", arquivos: [arq("video"), arq("capa")] }),
    );
    expect(yt.links.map((l) => l.campo)).toEqual(["video", "thumbnail_url"]);
    expect(() => montarPedido(pacote({ formato: "anuncio" }))).toThrow(ErroPedido);
    expect(() =>
      montarPedido(pacote({ canal: "linkedin", formato: "documento", arquivos: [arq("slide")] })),
    ).toThrow("Falta o PDF do documento.");
  });

  it("perfil e página vêm do tenant", () => {
    const p = montarPedido(
      pacote({ perfil: "cliente-x", pagina_linkedin: null, canal: "linkedin", formato: "texto" }),
    );
    expect(campo(p, "user")).toEqual(["cliente-x"]);
    expect(campo(p, "target_linkedin_page_id")).toEqual([]);
  });

  it("resposta de erro com link não vira publicada", () => {
    expect(
      lerSituacao({ status: "failed", error: "x", url: "https://instagram.com/p/y" }).tipo,
    ).toBe("falhou");
  });
});

describe("respostas", () => {
  it("lê publicada, enviada e falhou em formatos diferentes", () => {
    expect(
      lerSituacao({
        success: true,
        results: { instagram: { post_url: "https://instagram.com/p/x", post_id: "9" } },
      }),
    ).toEqual({
      tipo: "publicada",
      link: "https://instagram.com/p/x",
      id: "9",
    });
    expect(lerSituacao({ success: true, request_id: "req-1" })).toEqual({
      tipo: "enviada",
      id: "req-1",
    });
    expect(lerSituacao({ status: "failed", error: "Token expirado" })).toEqual({
      tipo: "falhou",
      erro: "Token expirado",
    });
    expect(lerSituacao({ status: "processing" })).toEqual({ tipo: "aguardando" });
  });

  it("nunca toma o link do nosso arquivo pelo link do post", () => {
    expect(
      lerSituacao({
        url: "https://x.supabase.co/storage/v1/object/sign/materiais/a.png",
        request_id: "r",
      }),
    ).toEqual({
      tipo: "enviada",
      id: "r",
    });
  });

  it("números: só os que vierem, nos nomes do Hub", () => {
    expect(lerNumeros({ reach: 1200, saved: "40", comments: 5, likes: -1, foo: 9 })).toEqual({
      alcance: 1200,
      salvamentos: 40,
      comentarios: 5,
    });
    expect(lerNumeros(null)).toEqual({});
  });

  it("acha o post pelo link (sem parâmetros) ou pelo id", () => {
    const posts = [
      { post_url: "https://instagram.com/p/abc/?igsh=1", post_id: "1", metrics: { reach: 1 } },
      { post_url: "https://instagram.com/p/def", post_id: "2", metrics: { reach: 2 } },
    ];
    expect(acharPost(posts, "https://instagram.com/p/abc", null)?.post_id).toBe("1");
    expect(acharPost(posts, null, "2")?.post_id).toBe("2");
    expect(acharPost(posts, "https://instagram.com/p/zzz", null)).toBeUndefined();
  });

  it("24 horas sem confirmação", () => {
    const agora = Date.parse("2026-10-30T12:00:00Z");
    expect(esperouDemais("2026-10-29T11:00:00Z", agora)).toBe(true);
    expect(esperouDemais("2026-10-30T10:00:00Z", agora)).toBe(false);
  });
});
