import { describe, expect, it } from "vitest";

import {
  centavosDoTexto,
  posicaoCursorDinheiro,
  textoDinheiroCompleto,
  textoDinheiroDeCentavos,
  textoDinheiroDigitando,
} from "@/lib/formatar";

describe("campo de dinheiro: digitando (RD-12)", () => {
  it("põe o ponto de milhar na hora", () => {
    expect(textoDinheiroDigitando("9")).toBe("9");
    expect(textoDinheiroDigitando("9000")).toBe("9.000");
    expect(textoDinheiroDigitando("1500000")).toBe("1.500.000");
    // Dígito novo depois de "9.000" reagrupa.
    expect(textoDinheiroDigitando("9.0001")).toBe("90.001");
  });
  it("aceita uma vírgula com até 2 casas", () => {
    expect(textoDinheiroDigitando("9.000,5")).toBe("9.000,5");
    expect(textoDinheiroDigitando("9.000,505")).toBe("9.000,50");
    expect(textoDinheiroDigitando("9,5,3")).toBe("9,53");
    expect(textoDinheiroDigitando("9000,")).toBe("9.000,");
  });
  it("vírgula primeiro vira 0,", () => {
    expect(textoDinheiroDigitando(",5")).toBe("0,5");
    expect(textoDinheiroDigitando(",")).toBe("0,");
  });
  it("ponto digitado no fim vira vírgula; apagando, o ponto é milhar", () => {
    expect(textoDinheiroDigitando("9000.")).toBe("9.000,");
    expect(textoDinheiroDigitando("9.00", { apagando: true })).toBe("900");
    expect(textoDinheiroDigitando("12.34", { apagando: true })).toBe("1.234");
  });
  it("ignora letras e tira zeros à esquerda", () => {
    expect(textoDinheiroDigitando("9a0b0c0")).toBe("9.000");
    expect(textoDinheiroDigitando("abc")).toBe("");
    expect(textoDinheiroDigitando("007")).toBe("7");
    expect(textoDinheiroDigitando("0")).toBe("0");
  });
  it("negativo só quando o campo permite", () => {
    expect(textoDinheiroDigitando("-500")).toBe("500");
    expect(textoDinheiroDigitando("-500", { permitirNegativo: true })).toBe("-500");
    expect(textoDinheiroDigitando("-", { permitirNegativo: true })).toBe("-");
  });
  it("recusa número com mais de 12 dígitos", () => {
    expect(textoDinheiroDigitando("999999999999")).toBe("999.999.999.999");
    expect(textoDinheiroDigitando("9999999999999")).toBeNull();
    expect(centavosDoTexto("9999999999999")).toBeNull();
  });
});

describe("campo de dinheiro: colar e gravar", () => {
  it("lê os formatos colados em centavos", () => {
    expect(centavosDoTexto("R$ 9.000,50")).toBe(900050);
    expect(centavosDoTexto("9000.50")).toBe(900050);
    expect(centavosDoTexto("9.000")).toBe(900000);
    expect(centavosDoTexto("9000")).toBe(900000);
    expect(centavosDoTexto("9000.5")).toBe(900050);
    expect(centavosDoTexto("R$ 1.500.000,00")).toBe(150000000);
    expect(textoDinheiroDigitando("R$ 9.000,50")).toBe("9.000,50");
    expect(textoDinheiroDigitando("9000.50")).toBe("9.000,50");
  });
  it("vazio é null, não zero", () => {
    expect(centavosDoTexto("")).toBeNull();
    expect(centavosDoTexto("R$ ")).toBeNull();
    expect(centavosDoTexto("-", { permitirNegativo: true })).toBeNull();
    expect(centavosDoTexto("0")).toBe(0);
  });
  it("lê negativo só quando permitido", () => {
    expect(centavosDoTexto("-1.250,30", { permitirNegativo: true })).toBe(-125030);
    expect(centavosDoTexto("-1.250,30")).toBe(125030);
  });
  it("não perde centavo com vírgula flutuante", () => {
    expect(centavosDoTexto("0,29")).toBe(29);
    expect(centavosDoTexto("1.234.567,89")).toBe(123456789);
  });
});

describe("campo de dinheiro: ao sair e vindo do banco", () => {
  it("completa 2 casas ao sair; vazio continua vazio", () => {
    expect(textoDinheiroCompleto("9.000")).toBe("9.000,00");
    expect(textoDinheiroCompleto("0,5")).toBe("0,50");
    expect(textoDinheiroCompleto("9.000,")).toBe("9.000,00");
    expect(textoDinheiroCompleto("")).toBe("");
    expect(textoDinheiroCompleto("-", { permitirNegativo: true })).toBe("");
  });
  it("mostra centavos do banco no formato brasileiro", () => {
    expect(textoDinheiroDeCentavos(900050)).toBe("9.000,50");
    expect(textoDinheiroDeCentavos(900000)).toBe("9.000,00");
    expect(textoDinheiroDeCentavos(5)).toBe("0,05");
    expect(textoDinheiroDeCentavos(-125030)).toBe("-1.250,30");
    expect(textoDinheiroDeCentavos(null)).toBe("");
  });
});

describe("campo de dinheiro: cursor", () => {
  it("fica no fim ao digitar no fim, mesmo com o ponto entrando", () => {
    expect(posicaoCursorDinheiro("9000", 4, "9.000")).toBe(5);
  });
  it("não pula para o fim ao digitar no meio", () => {
    // "9|000" + "1" → "91000" com o cursor depois do 1 → "91|.000"
    expect(posicaoCursorDinheiro("91000", 2, "91.000")).toBe(2);
    // "1.2|34" + "5" → "1.2534" → "12.534": cursor depois do 5 (3 dígitos) → "12.5|34"
    expect(posicaoCursorDinheiro("1.2534", 4, "12.534")).toBe(4);
    // "123|4" (sem ponto) vira "1.234": cursor depois de 3 dígitos → "1.23|4"
    expect(posicaoCursorDinheiro("1234", 3, "1.234")).toBe(4);
  });
  it("apagando no meio mantém o lugar", () => {
    // "12.3|45" apaga o 3 → "12.45" → "1.245": cursor depois de 2 dígitos → "1.2|45"
    expect(posicaoCursorDinheiro("12.45", 3, "1.245", { apagando: true })).toBe(3);
  });
  it("vírgula primeiro deixa o cursor depois da vírgula", () => {
    expect(posicaoCursorDinheiro(",", 1, "0,")).toBe(2);
    expect(posicaoCursorDinheiro("9000.", 5, "9.000,")).toBe(6);
  });
});
