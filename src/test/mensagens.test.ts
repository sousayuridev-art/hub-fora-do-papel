import { describe, expect, it } from "vitest";

import {
  linkEmail,
  mensagemAdicional,
  mensagemCobranca,
  mensagemConvite,
  mensagemLembrete,
  mensagemProposta,
} from "@/lib/mensagens";

const base = { contato: "Marina Alves", remetente: "Yuri" };

const exclamacoes = (t: string) => (t.match(/!/g) ?? []).length;
const emoji = /\p{Extended_Pictographic}/u;

describe("mensagens ao cliente (CX-1)", () => {
  it("proposta: nome, link, validade e assunto que diz o conteúdo", () => {
    const m = mensagemProposta({
      ...base,
      empresa: "Clínica Bem Cuidar",
      titulo: "Sistema de agendamento",
      link: "https://x/proposta/abc",
      validade: "4 de novembro",
      totalCents: 954000,
      parcelas: 3,
    });
    expect(m.whatsapp.startsWith("Oi, Marina! Aqui é o Yuri, da Fora do Papel.")).toBe(true);
    expect(m.whatsapp).toContain("https://x/proposta/abc");
    expect(m.whatsapp).toContain("4 de novembro");
    expect(m.assunto).toBe("Sua proposta: Sistema de agendamento da Clínica Bem Cuidar");
    expect(m.email).toContain("em 3 parcelas");
    expect(m.email.startsWith("Olá, Marina.")).toBe(true);
  });

  it("nota pessoal entra logo depois da saudação", () => {
    const m = mensagemConvite({
      ...base,
      nota: "Qualquer coisa me chama.",
      empresa: "Clínica",
      email: "m@c.br",
      portal: "https://x/portal",
    });
    expect(m.whatsapp.split("\n")[1]).toBe("Qualquer coisa me chama.");
    expect(m.email.split("\n")[2]).toBe("Qualquer coisa me chama.");
  });

  it("no máximo uma exclamação e nenhum emoji no e-mail", () => {
    const todas = [
      mensagemAdicional({ ...base, titulo: "Lembrete", valorCents: 120000, link: "l" }),
      mensagemLembrete({ ...base, itens: ["Aprovar a tela"], link: "l" }),
      mensagemCobranca({
        ...base,
        descricao: "2ª parcela",
        valorCents: 318000,
        vencimento: "24/10",
        diasAtraso: 0,
        hoje: false,
        link: "l",
      }),
    ];
    for (const m of todas) {
      expect(exclamacoes(m.whatsapp)).toBeLessThanOrEqual(1);
      expect(exclamacoes(m.email)).toBe(0);
      expect(emoji.test(m.email)).toBe(false);
    }
  });

  it("cobrança atrasada diz que venceu", () => {
    const m = mensagemCobranca({
      ...base,
      descricao: "2ª parcela",
      valorCents: 318000,
      vencimento: "24/10",
      diasAtraso: 2,
      hoje: false,
      link: "l",
    });
    expect(m.whatsapp).toContain("venceu em 24/10");
  });

  it("e-mail só com endereço válido", () => {
    const m = mensagemLembrete({ ...base, itens: ["x"], link: "l" });
    expect(linkEmail("sem-arroba", m)).toBeNull();
    expect(linkEmail("m@c.br", m)).toMatch(/^mailto:m%40c\.br\?subject=/);
  });
});
