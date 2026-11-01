import { describe, expect, it } from "vitest";

import {
  acharEvento,
  chaveDoSegredo,
  cifrar,
  convidadosDoEvento,
  decifrar,
  emailDoIdToken,
  escoposConcedidos,
  inicioDaJanela,
  montarFalas,
  nomeDoParticipante,
  origemPermitida,
  situacaoSemFalas,
  urlDeAutorizacao,
} from "../../supabase/functions/reunioes-google/logica";

function idToken(dados: object): string {
  const b = btoa(JSON.stringify(dados)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `cabecalho.${b}.assinatura`;
}

describe("RE-1 · cifra do token", () => {
  it("cifra e decifra com a mesma chave; outra chave não abre", async () => {
    const chave = await chaveDoSegredo("segredo-do-cliente-oauth");
    const c1 = await cifrar("1//token-de-renovacao", chave, "agencia-1");
    const c2 = await cifrar("1//token-de-renovacao", chave, "agencia-1");
    expect(c1).not.toContain("token-de-renovacao");
    expect(c1).not.toBe(c2);
    expect(await decifrar(c1, chave, "agencia-1")).toBe("1//token-de-renovacao");
    const outra = await chaveDoSegredo("outro-segredo-qualquer");
    await expect(decifrar(c1, outra, "agencia-1")).rejects.toThrow();
    await expect(decifrar(c1, chave, "agencia-2")).rejects.toThrow();
  });
});

describe("RE-1 · OAuth", () => {
  it("pede acesso offline com os escopos mínimos", () => {
    const u = new URL(
      urlDeAutorizacao(
        "id.apps",
        "https://x.supabase.co/functions/v1/reunioes-google/retorno",
        "a".repeat(64),
      ),
    );
    expect(u.searchParams.get("access_type")).toBe("offline");
    expect(u.searchParams.get("prompt")).toBe("consent");
    expect(u.searchParams.get("scope")?.split(" ")).toEqual([
      "https://www.googleapis.com/auth/meetings.space.readonly",
      "https://www.googleapis.com/auth/calendar.events",
      "openid",
      "email",
    ]);
  });

  it("só aceita e-mail verificado do id_token", () => {
    expect(
      emailDoIdToken(idToken({ email: "Yuri@ForaDoPapel.com.br", email_verified: true })),
    ).toBe("yuri@foradopapel.com.br");
    expect(emailDoIdToken(idToken({ email: "x@y.com", email_verified: false }))).toBeNull();
    expect(emailDoIdToken(undefined)).toBeNull();
    expect(emailDoIdToken("lixo")).toBeNull();
  });

  it("exige os dois escopos concedidos", () => {
    expect(
      escoposConcedidos(
        "openid https://www.googleapis.com/auth/meetings.space.readonly https://www.googleapis.com/auth/calendar.events",
      ),
    ).toBe(true);
    expect(escoposConcedidos("https://www.googleapis.com/auth/calendar.events")).toBe(false);
  });

  it("volta só para o Hub", () => {
    expect(origemPermitida("https://spring-board-kit.lovable.app")).toBe(true);
    expect(origemPermitida("https://hub.foradopapel.com.br")).toBe(true);
    expect(origemPermitida("http://127.0.0.1:5173")).toBe(true);
    expect(origemPermitida("https://foradopapel.com.br.malicioso.test")).toBe(false);
    expect(origemPermitida("https://spring-board-kit.lovable.app.evil.test")).toBe(false);
    expect(origemPermitida(null)).toBe(false);
  });
});

describe("RE-1 · Meet e Agenda", () => {
  it("monta as falas com quem falou e o segundo", () => {
    const nomes = new Map([["conferenceRecords/a/participants/1", "Marina"]]);
    const falas = montarFalas(
      [
        {
          participant: "conferenceRecords/a/participants/1",
          text: " Hoje é no papel. ",
          startTime: "2026-10-21T16:37:04Z",
        },
        {
          participant: "conferenceRecords/a/participants/9",
          text: "Oi",
          startTime: "2026-10-21T16:38:00.500Z",
        },
        { participant: "conferenceRecords/a/participants/1", text: "   " },
      ],
      nomes,
      "2026-10-21T16:37:00Z",
    );
    expect(falas).toEqual([
      { quem: "Marina", seg: 4, texto: "Hoje é no papel." },
      { quem: "Participante", seg: 60, texto: "Oi" },
    ]);
  });

  it("nome do participante cai em 'Participante'", () => {
    expect(nomeDoParticipante({ name: "p", phoneUser: { displayName: "+55 79 ****" } })).toBe(
      "+55 79 ****",
    );
    expect(nomeDoParticipante({ name: "p" })).toBe("Participante");
  });

  it("acha o evento pelo código e limpa os convidados", () => {
    const eventos = [
      { id: "1", hangoutLink: "https://meet.google.com/abc-defg-hij" },
      {
        id: "2",
        conferenceData: { conferenceId: "tuy-wrbo-myq" },
        attendees: [
          { email: "Marina@BemCuidar.test", displayName: "Marina" },
          { email: "marina@bemcuidar.test" },
          { email: "sala@resource.calendar.google.com", resource: true },
        ],
      },
    ];
    expect(acharEvento(eventos, "TUY-WRBO-MYQ")?.id).toBe("2");
    expect(acharEvento(eventos, "abc-defg-hij")?.id).toBe("1");
    expect(acharEvento(eventos, undefined)).toBeNull();
    expect(convidadosDoEvento(acharEvento(eventos, "tuy-wrbo-myq"))).toEqual([
      { email: "marina@bemcuidar.test", nome: "Marina" },
    ]);
  });

  it("espera 2 horas antes de dizer 'Sem transcrição'", () => {
    const fim = "2026-10-21T17:00:00Z";
    expect(situacaoSemFalas(fim, Date.parse("2026-10-21T18:00:00Z"))).toBe(
      "aguardando_transcricao",
    );
    expect(situacaoSemFalas(fim, Date.parse("2026-10-21T19:01:00Z"))).toBe("sem_transcricao");
  });

  it("janela: 30 dias na primeira busca, depois 48 horas antes da última", () => {
    const agora = Date.parse("2026-10-21T18:00:00Z");
    expect(inicioDaJanela(null, agora)).toBe("2026-09-21T18:00:00.000Z");
    expect(inicioDaJanela("2026-10-21T17:00:00Z", agora)).toBe("2026-10-19T17:00:00.000Z");
  });
});

describe("RD2-3 · agenda da semana e marcar reunião", () => {
  it("aceita janela de até 8 dias e recusa o resto", async () => {
    const { janelaValida } = await import("../../supabase/functions/reunioes-google/logica");
    expect(janelaValida("2026-11-02T03:00:00Z", "2026-11-07T03:00:00Z")).not.toBeNull();
    expect(janelaValida("2026-11-07T03:00:00Z", "2026-11-02T03:00:00Z")).toBeNull();
    expect(janelaValida("2026-11-01T00:00:00Z", "2026-11-20T00:00:00Z")).toBeNull();
    expect(janelaValida("ontem", "hoje")).toBeNull();
  });

  it("transforma eventos: tira cancelados e a própria pessoa, marca dia inteiro", async () => {
    const { eventosParaAgenda } = await import("../../supabase/functions/reunioes-google/logica");
    const r = eventosParaAgenda([
      {
        id: "a",
        summary: "Conversa inicial",
        start: { dateTime: "2026-11-03T13:00:00Z" },
        end: { dateTime: "2026-11-03T13:30:00Z" },
        hangoutLink: "https://meet.google.com/abc-defg-hij",
        attendees: [
          { email: "yuri@fdp.test", self: true },
          { email: "Ana@Loja.test", displayName: "Ana" },
        ],
      },
      { id: "b", status: "cancelled", start: { dateTime: "2026-11-03T15:00:00Z" } },
      { id: "c", summary: "Feriado", start: { date: "2026-11-02" }, end: { date: "2026-11-03" } },
      {
        id: "d",
        hangoutLink: "https://exemplo.test/x",
        start: { dateTime: "2026-11-04T12:00:00Z" },
        end: { dateTime: "2026-11-04T13:00:00Z" },
      },
    ]);
    expect(r.map((e) => e.id)).toEqual(["a", "c", "d"]);
    expect(r[0]?.convidados).toEqual([{ email: "ana@loja.test", nome: "Ana" }]);
    expect(r[1]?.dia_inteiro).toBe(true);
    expect(r[2]?.meet).toBeNull();
    expect(r[2]?.titulo).toBe("Sem título");
  });

  it("monta o evento com Meet e só e-mails válidos", async () => {
    const { eventoParaCriar } = await import("../../supabase/functions/reunioes-google/logica");
    const ok = eventoParaCriar(
      {
        titulo: " Conversa inicial ",
        inicio: "2026-11-03T13:00:00Z",
        fim: "2026-11-03T13:30:00Z",
        convidados: ["Ana@Loja.test", "ana@loja.test", "nao-e-email"],
      },
      "pedido-1",
    );
    expect("corpo" in ok && ok.corpo["summary"]).toBe("Conversa inicial");
    expect("corpo" in ok && ok.corpo["attendees"]).toEqual([{ email: "ana@loja.test" }]);
    expect(eventoParaCriar({ titulo: "", inicio: "x", fim: "y" }, "p")).toEqual({
      erro: "titulo_obrigatorio",
    });
    expect(
      eventoParaCriar(
        { titulo: "Longa", inicio: "2026-11-03T08:00:00Z", fim: "2026-11-03T20:00:00Z" },
        "p",
      ),
    ).toEqual({ erro: "horario_invalido" });
  });
});
