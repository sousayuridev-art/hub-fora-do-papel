import { describe, expect, it } from "vitest";

import { infoDoCartao, type CartaoProposta } from "@/lib/propostas";

const cartao = (p: Partial<CartaoProposta>): CartaoProposta => ({
  id: "1",
  deal_id: "d",
  client_id: "c",
  status: "rascunho",
  situacao: "rascunho",
  versao: 1,
  empresa: "Empresa",
  contato: "Contato",
  titulo: null,
  valor_cents: null,
  enviada_em: null,
  dias_desde_envio: null,
  sem_abrir: false,
  vezes_aberta: 0,
  aberta_em: null,
  vence_em: null,
  aceita_em: null,
  projeto_id: null,
  recusada_em: null,
  motivo: null,
  falta: [],
  criada_em: "2026-10-01T12:00:00Z",
  atualizada_em: "2026-10-01T12:00:00Z",
  ...p,
});

describe("infoDoCartao (RD-5)", () => {
  it("rascunho diz o que falta e quantos itens a mais", () => {
    const i = infoDoCartao(cartao({ falta: ["escolher a mensalidade", "conferir o prazo"] }));
    expect(i).toEqual({ texto: "Falta: escolher a mensalidade e mais 1", tom: "atencao" });
    expect(infoDoCartao(cartao({})).texto).toBe("Pronta para enviar");
  });

  it("enviada sem abrir há mais de 3 dias pede atenção", () => {
    const i = infoDoCartao(
      cartao({ status: "enviada", situacao: "enviada", dias_desde_envio: 5, sem_abrir: true }),
    );
    expect(i).toEqual({ texto: "Enviada há 5 dias · não abriu", tom: "risco" });
    expect(
      infoDoCartao(cartao({ status: "enviada", situacao: "enviada", dias_desde_envio: 1 })).texto,
    ).toBe("Enviada ontem · não abriu");
  });

  it("enviada aberta mostra as vezes e a validade", () => {
    const i = infoDoCartao(
      cartao({
        status: "enviada",
        situacao: "enviada",
        vezes_aberta: 2,
        vence_em: "2026-10-30T15:00:00Z",
      }),
    );
    expect(i.texto).toBe("Aberta 2 vezes · vale até 30/10");
  });

  it("vencida, aceita e recusada", () => {
    expect(
      infoDoCartao(
        cartao({ status: "enviada", situacao: "vencida", vence_em: "2026-10-05T15:00:00Z" }),
      ).tom,
    ).toBe("risco");
    expect(
      infoDoCartao(
        cartao({
          status: "aceita",
          situacao: "aceita",
          aceita_em: "2026-09-25T15:00:00Z",
          projeto_id: "p",
        }),
      ).texto,
    ).toBe("Aceita em 25/09 · projeto criado");
    expect(
      infoDoCartao(cartao({ status: "recusada", situacao: "recusada", motivo: "Preço" })).texto,
    ).toBe("Motivo: Preço");
  });
});
