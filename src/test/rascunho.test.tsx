import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useRascunho } from "@/components/marketing/useRascunho";

describe("useRascunho", () => {
  it("guarda o que foi digitado se a gravação falha e o banco volta", () => {
    const { result, rerender } = renderHook(({ s }) => useRascunho(s), { initialProps: { s: "" } });
    act(() => {
      result.current[1]("A");
      result.current[2]("A");
    });
    rerender({ s: "A" });
    rerender({ s: "" });
    expect(result.current[0]).toBe("A");
  });

  it("depois de liberar (sugestão da IA usada), mostra o novo valor do banco", () => {
    const { result, rerender } = renderHook(({ s }) => useRascunho(s), { initialProps: { s: "" } });
    act(() => {
      result.current[1]("A");
      result.current[2]("A");
    });
    rerender({ s: "A" });
    act(() => result.current[3]());
    rerender({ s: "B" });
    expect(result.current[0]).toBe("B");
  });
});
