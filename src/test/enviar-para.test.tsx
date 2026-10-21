import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EnviarParaPainel } from "@/components/hub/EnviarParaPainel";
import { mensagemConvite } from "@/lib/mensagens";

const gerar = (nota: string) =>
  mensagemConvite({
    contato: "Marina Alves",
    remetente: "Yuri",
    nota,
    empresa: "Clínica",
    email: "m@c.br",
    portal: "https://x/portal",
  });

describe("painel Enviar para (CX-2)", () => {
  it("abre no WhatsApp com o texto pronto e troca para e-mail", () => {
    render(
      <EnviarParaPainel
        aberto
        aoMudar={() => undefined}
        nome="Marina Alves"
        whatsapp="79900000010"
        email="m@c.br"
        link="https://x/portal"
        previa={{ titulo: "Portal da Clínica", linha: "Fora do Papel" }}
        gerar={gerar}
      />,
    );
    expect(screen.getByText("Enviar para Marina")).toBeInTheDocument();
    const zap = screen.getByRole("link", { name: /Abrir no WhatsApp/ });
    expect(zap.getAttribute("href")).toMatch(
      /^https:\/\/wa\.me\/5579900000010\?text=Oi%2C%20Marina/,
    );

    fireEvent.change(screen.getByLabelText(/Nota pessoal/), { target: { value: "Até já." } });
    expect(screen.getByRole("link", { name: /Abrir no WhatsApp/ }).getAttribute("href")).toContain(
      encodeURIComponent("Até já."),
    );

    fireEvent.click(screen.getByRole("tab", { name: "E-mail" }));
    expect(screen.getByRole("link", { name: /Abrir no e-mail/ }).getAttribute("href")).toMatch(
      /^mailto:m%40c\.br\?subject=/,
    );
  });

  it("sem WhatsApp cadastrado, oferece copiar o texto", () => {
    render(
      <EnviarParaPainel
        aberto
        aoMudar={() => undefined}
        nome={null}
        whatsapp={null}
        email={null}
        link="l"
        previa={{ titulo: "t", linha: "l" }}
        gerar={gerar}
      />,
    );
    expect(screen.getByRole("button", { name: /copiar texto/ })).toBeInTheDocument();
  });
});
