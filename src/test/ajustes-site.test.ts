import { describe, expect, it } from "vitest";

import { horarioPadrao, problemaDoNegocio } from "@/lib/ajustesSite";

describe("PC-6 · dados do negócio", () => {
  it("aceita o horário padrão e dados completos", () => {
    expect(
      problemaDoNegocio({
        nome: "Clínica Sol",
        whatsapp: "(79) 99999-0001",
        instagram: "@clinica.sol",
        horario: horarioPadrao,
      }),
    ).toBeNull();
  });
  it("explica o problema antes de mandar ao banco", () => {
    expect(problemaDoNegocio({ nome: "C" })).toContain("nome");
    expect(problemaDoNegocio({ nome: "Clínica", whatsapp: "1234" })).toContain("DDD");
    expect(problemaDoNegocio({ nome: "Clínica", instagram: "minha clinica" })).toContain(
      "Instagram",
    );
    expect(
      problemaDoNegocio({
        nome: "Clínica",
        horario: [{ dias: "Sábado", abre: "14:00", fecha: "09:00" }],
      }),
    ).toContain("Sábado");
    expect(
      problemaDoNegocio({ nome: "Clínica", horario: [{ dias: "Domingo", fechado: true }] }),
    ).toBeNull();
  });
});
