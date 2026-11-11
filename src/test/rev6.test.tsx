import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { opcoesDeAdiar } from "@/lib/tarefas";
import { AgendaSemana } from "@/components/reunioes/AgendaSemana";

describe("REV-6 · revisão geral do Hub", () => {
  it("Mudar o prazo: hoje, amanhã e a próxima segunda", () => {
    // 11/11/2026 é quarta-feira
    expect(opcoesDeAdiar("2026-11-11").map((o) => o.prazo)).toEqual([
      "2026-11-11",
      "2026-11-12",
      "2026-11-16",
    ]);
    // Numa segunda, a "próxima segunda" é a da semana seguinte
    expect(opcoesDeAdiar("2026-11-16")[2]?.prazo).toBe("2026-11-23");
  });

  it("semana sem reuniões mostra o aviso com Marcar reunião, sem a grade vazia", () => {
    render(
      <AgendaSemana
        segunda={new Date(2026, 10, 9)}
        eventos={[]}
        ligacoes={{}}
        carregando={false}
        aoAbrir={() => {}}
        aoMudarSemana={() => {}}
        aoMarcar={() => {}}
      />,
    );
    expect(screen.getByText(/Nenhuma reunião nesta semana/)).toBeTruthy();
    expect(screen.getByText("Marcar reunião ›")).toBeTruthy();
    expect(screen.queryByText("SEG")).toBeNull();
  });
});
