import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TranscricaoLista } from "@/components/reunioes/TranscricaoLista";
import { textoDaTranscricao } from "@/lib/reunioes";

const falas = [
  { quem: "Pessoa A", seg: 5, texto: "Bom dia." },
  { quem: "Pessoa B", seg: 725, texto: " Vamos ao escopo. " },
];

describe("RE-2 · copiar a transcrição inteira", () => {
  it("monta o texto com tempo, quem fala e a fala, uma por linha", () => {
    expect(textoDaTranscricao(falas)).toBe(
      "[0:05] Pessoa A: Bom dia.\n[12:05] Pessoa B: Vamos ao escopo.",
    );
  });

  it("o botão copia tudo e o campo mostra o texto completo", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<TranscricaoLista falas={falas} />);
    expect(screen.getByLabelText("Transcrição completa")).toHaveValue(textoDaTranscricao(falas));
    fireEvent.click(screen.getByRole("button", { name: "Copiar transcrição" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(textoDaTranscricao(falas)));
    expect(await screen.findByRole("button", { name: "Copiada" })).toBeInTheDocument();
  });
});
