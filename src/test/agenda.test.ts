import { describe, expect, it } from "vitest";

import {
  blocosDoDia,
  diasUteis,
  horasDaGrade,
  rotuloSemanaUtil,
  segundaDa,
  semanaParaAbrir,
  type EventoAgenda,
} from "@/lib/agenda";

const ev = (
  id: string,
  inicio: string,
  fim: string,
  extra: Partial<EventoAgenda> = {},
): EventoAgenda => ({
  id,
  titulo: id,
  inicio,
  fim,
  dia_inteiro: false,
  meet: null,
  local: null,
  convidados: [],
  ...extra,
});

describe("RD2-3 · agenda da semana", () => {
  it("acha a segunda da semana (domingo volta 6 dias) e os 5 dias úteis", () => {
    expect(segundaDa(new Date(2026, 10, 1)).getDate()).toBe(26); // domingo 1/11 → segunda 26/10
    expect(segundaDa(new Date(2026, 10, 4)).getDate()).toBe(2); // quarta 4/11 → 2/11
    expect(diasUteis(new Date(2026, 10, 2)).map((d) => d.getDate())).toEqual([2, 3, 4, 5, 6]);
    expect(semanaParaAbrir(new Date(2026, 10, 1)).getDate()).toBe(2); // domingo abre a próxima
    expect(semanaParaAbrir(new Date(2026, 10, 4)).getDate()).toBe(2);
  });

  it("escreve a semana por extenso, inclusive na virada do mês", () => {
    expect(rotuloSemanaUtil(new Date(2026, 10, 2))).toBe("2 a 6 de novembro de 2026");
    expect(rotuloSemanaUtil(new Date(2026, 9, 26))).toBe("26 a 30 de outubro de 2026");
    expect(rotuloSemanaUtil(new Date(2026, 10, 30))).toBe("30 de novembro a 4 de dezembro de 2026");
  });

  it("alarga a grade para reuniões fora das 8h–18h", () => {
    expect(horasDaGrade([])).toEqual({ de: 8, ate: 18 });
    const cedo = ev(
      "a",
      new Date(2026, 10, 2, 7, 30).toISOString(),
      new Date(2026, 10, 2, 8).toISOString(),
    );
    const tarde = ev(
      "b",
      new Date(2026, 10, 2, 18, 0).toISOString(),
      new Date(2026, 10, 2, 19, 15).toISOString(),
    );
    expect(horasDaGrade([cedo, tarde])).toEqual({ de: 7, ate: 20 });
  });

  it("põe reuniões que se cruzam lado a lado", () => {
    const dia = new Date(2026, 10, 2);
    const a = ev(
      "a",
      new Date(2026, 10, 2, 10).toISOString(),
      new Date(2026, 10, 2, 11).toISOString(),
    );
    const b = ev(
      "b",
      new Date(2026, 10, 2, 10, 30).toISOString(),
      new Date(2026, 10, 2, 11, 30).toISOString(),
    );
    const c = ev(
      "c",
      new Date(2026, 10, 2, 14).toISOString(),
      new Date(2026, 10, 2, 14, 30).toISOString(),
    );
    const outroDia = ev(
      "d",
      new Date(2026, 10, 3, 10).toISOString(),
      new Date(2026, 10, 3, 11).toISOString(),
    );
    const r = blocosDoDia([a, b, c, outroDia], dia, 8);
    const pos = Object.fromEntries(r.map((x) => [x.evento.id, x]));
    expect(Object.keys(pos).sort()).toEqual(["a", "b", "c"]);
    expect(pos["a"]).toMatchObject({ topo: 120, altura: 60, coluna: 0, colunas: 2 });
    expect(pos["b"]).toMatchObject({ coluna: 1, colunas: 2 });
    expect(pos["c"]).toMatchObject({ topo: 360, coluna: 0, colunas: 1 });
  });
});
