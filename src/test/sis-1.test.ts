import { describe, expect, it } from "vitest";

import {
  enderecoValido,
  mensagemDoSistema,
  normalizarEndereco,
  textoDoAvisoSistema,
} from "@/lib/sistemas";

const hoje = new Date("2026-11-03T10:00:00");

describe("SIS-1 · sistemas", () => {
  it("endereço ganha https e recusa http, espaço e texto sem domínio", () => {
    expect(normalizarEndereco(" app.plamev.com.br/painel ")).toBe(
      "https://app.plamev.com.br/painel",
    );
    expect(normalizarEndereco("http://plamev.com.br")).toBe("https://plamev.com.br");
    expect(normalizarEndereco("")).toBe("");
    expect(enderecoValido("https://app.plamev.com.br")).toBe(true);
    expect(enderecoValido("")).toBe(true);
    expect(enderecoValido("https://plamev")).toBe(false);
    expect(enderecoValido("https://pla mev.com")).toBe(false);
  });

  it("aviso principal: o primeiro que o banco manda, em português", () => {
    expect(textoDoAvisoSistema({ avisos: [] }, hoje)).toBeNull();
    expect(
      textoDoAvisoSistema({ avisos: [{ tipo: "cobranca_atrasada", desde: "2026-10-20" }] }, hoje),
    ).toEqual({ texto: "Cobrança do cliente em atraso.", tom: "risco" });
    expect(
      textoDoAvisoSistema({ avisos: [{ tipo: "servico_vence", em: "2026-11-05" }] }, hoje),
    ).toEqual({
      texto: "Um serviço do sistema vence em 2 dias.",
      tom: "risco",
    });
    expect(
      textoDoAvisoSistema({ avisos: [{ tipo: "servico_vence", em: "2026-11-25" }] }, hoje)?.tom,
    ).toBe("atencao");
    expect(
      textoDoAvisoSistema({ avisos: [{ tipo: "servico_vence", em: "2026-11-01" }] }, hoje)?.texto,
    ).toMatch(/venceu/);
    expect(textoDoAvisoSistema({ avisos: [{ tipo: "sem_endereco" }] }, hoje)?.texto).toMatch(
      /sem o endereço/,
    );
    expect(
      textoDoAvisoSistema(
        { avisos: [{ tipo: "pedidos_abertos", n: 1, desde: "2026-11-01" }] },
        hoje,
      )?.texto,
    ).toBe("1 pedido de ajuste aberto.");
  });

  it("erros do banco viram frases", () => {
    expect(mensagemDoSistema(new Error("projeto_ja_tem_sistema"))).toMatch(/já tem um sistema/);
    expect(
      mensagemDoSistema({
        message: 'new row violates check constraint "sistemas_url_producao_check"',
      }),
    ).toMatch(/endereço de produção/);
    expect(mensagemDoSistema(new Error("A imagem passa de 1 MB. Use um print menor."))).toMatch(
      /1 MB/,
    );
    expect(mensagemDoSistema(new Error("qualquer"))).toBeNull();
  });
});
