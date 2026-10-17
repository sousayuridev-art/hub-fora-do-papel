import { describe, expect, it } from "vitest";

import { crc16, pixCopiaECola } from "@/lib/pix";

describe("Pix copia e cola", () => {
  it("usa o CRC16-CCITT exigido pelo Banco Central", () => {
    expect(crc16("123456789")).toBe("29B1");
  });

  it("monta o código com chave, valor, nome sem acento e verificação no fim", () => {
    const codigo = pixCopiaECola({
      chave: "pix@foradopapel.com.br",
      nome: "Fora do Papel Ltda",
      cidade: "Aracaju",
      valorCents: 360000,
      identificador: "4b1c-22aa",
    });
    expect(codigo.startsWith("000201")).toBe(true);
    expect(codigo).toContain("0014br.gov.bcb.pix0122pix@foradopapel.com.br");
    expect(codigo).toContain("54073600.00");
    expect(codigo).toContain("5918FORA DO PAPEL LTDA");
    expect(codigo).toContain("6007ARACAJU");
    expect(codigo).toContain("621205084b1c22aa");
    const corpo = codigo.slice(0, -4);
    expect(codigo.slice(-4)).toBe(crc16(corpo));
  });
});
