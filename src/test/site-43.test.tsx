import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CapaDoSite } from "@/components/sites/CapaDoSite";
import { fotoDoSiteNoAr } from "@/lib/sitesHub";

describe("SITE-43 · foto do site no ar na capa", () => {
  it("monta o endereço da foto só com domínio válido", () => {
    expect(fotoDoSiteNoAr("www.mansaomediterraneo.com")).toBe(
      "https://s0.wp.com/mshots/v1/https%3A%2F%2Fwww.mansaomediterraneo.com%2F?w=1280&h=800",
    );
    expect(fotoDoSiteNoAr("javascript:alert(1)")).toBeNull();
  });

  it("sem página do Hub, mostra a foto em vez do aviso", () => {
    const { container, queryByText } = render(
      <CapaDoSite capa={null} dominio="www.mansaomediterraneo.com" />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toContain("mshots");
    expect(queryByText("Ainda sem página publicada")).toBeNull();
  });

  it("sem domínio, continua o aviso", () => {
    const { getByText } = render(<CapaDoSite capa={null} />);
    expect(getByText("Ainda sem página publicada")).toBeTruthy();
  });
});
