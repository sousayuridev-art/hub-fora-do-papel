import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useMutacoesMarketing } from "@/components/marketing/useMutacoesMarketing";
import { chavesMarketing, type ListaPecas, type Peca } from "@/lib/marketing";

const erro = vi.fn();
vi.mock("@/lib/notify", () => ({
  ok: vi.fn(),
  erro: (...a: unknown[]) => erro(...a),
  mensagemDeErro: () => "Sem conexão com o servidor. Confira sua internet.",
}));

const moverPeca = vi.fn();
vi.mock("@/lib/marketing", async (original) => ({
  ...(await original<typeof import("@/lib/marketing")>()),
  moverPeca: (...a: unknown[]) => moverPeca(...a),
}));

const peca: Peca = {
  id: "p1",
  title: "Por que a planilha trava",
  core_idea: "A planilha cresce.",
  objective: "conversa",
  funnel: "descoberta",
  pillar: "problema",
  front: "sistemas",
  audience: null,
  series: null,
  art_direction: null,
  campaign_id: null,
  client_id: null,
  client_authorized: false,
  due_date: null,
  stage: "briefing",
  stage_changed_at: "2026-10-29T12:00:00Z",
  created_at: "2026-10-29T12:00:00Z",
  coluna: "planejamento",
  campanha: null,
  cliente: null,
  versoes: [],
  falta: [],
};

describe("Central de conteúdo: mover sem rede (MK-1)", () => {
  beforeEach(() => {
    erro.mockReset();
    moverPeca.mockReset();
  });

  it("move na hora, volta ao lugar no erro e oferece Tentar de novo", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const chave = chavesMarketing.lista({});
    qc.setQueryData<ListaPecas>(chave, { hoje: "2026-10-29", itens: [peca] });
    let falhar!: (e: unknown) => void;
    moverPeca.mockReturnValue(new Promise((_, rej) => (falhar = rej)));

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useMutacoesMarketing(), { wrapper });

    act(() => result.current.mover.mutate({ id: "p1", etapa: "producao" }));
    await waitFor(() =>
      expect(qc.getQueryData<ListaPecas>(chave)?.itens[0]?.coluna).toBe("criacao"),
    );

    await act(async () => falhar(new TypeError("Failed to fetch")));
    await waitFor(() => expect(erro).toHaveBeenCalled());
    expect(qc.getQueryData<ListaPecas>(chave)?.itens[0]?.stage).toBe("briefing");
    const [, opcoes] = erro.mock.calls[0] as [string, { tentarDeNovo?: () => void }];
    expect(typeof opcoes.tentarDeNovo).toBe("function");
  });
});
