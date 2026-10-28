import { describe, expect, it } from "vitest";

import { gruposDoPortal } from "@/components/layout/navegacao";
import { linkWhatsApp, telefoneLegivel } from "@/lib/contatosSite";

describe("PC-5 · contatos do site", () => {
  it("monta a mensagem pronta do WhatsApp com o primeiro nome e a empresa", () => {
    const link = linkWhatsApp({ nome: "Ana Lima", telefone: "79999990001" }, "Clínica Sol");
    expect(link).toBe(
      `https://wa.me/5579999990001?text=${encodeURIComponent("Oi, Ana! Aqui é da Clínica Sol. Vi sua mensagem pelo site.")}`,
    );
    expect(linkWhatsApp({ nome: "Ana", telefone: null }, "Clínica Sol")).toBeNull();
    expect(linkWhatsApp({ nome: null, telefone: "5579999990001" }, "X")).toContain(
      "wa.me/5579999990001",
    );
  });
  it("mostra o telefone no formato brasileiro", () => {
    expect(telefoneLegivel("79999990001")).toBe("(79) 99999-0001");
    expect(telefoneLegivel("7932110000")).toBe("(79) 3211-0000");
    expect(telefoneLegivel("5579999990001")).toBe("(79) 99999-0001");
  });
  it("Contatos funciona e tem selo quando o módulo está contratado", () => {
    const item = gruposDoPortal("equipe", ["contatos"])
      .flatMap((g) => g.itens)
      .find((i) => i.rotulo === "Contatos");
    expect(item).toMatchObject({ para: "/portal/clientes/contatos", selo: "contatos" });
    expect(item?.emBreve).toBeUndefined();
  });
});
