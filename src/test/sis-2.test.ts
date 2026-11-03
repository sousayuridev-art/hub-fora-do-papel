import { describe, expect, it } from "vitest";

import { enderecoDaFuncao } from "@/lib/pedidosSistema";
import { origemDoPedido } from "@/lib/pedidos";
import {
  erroPublico,
  lerChave,
  lerMensagem,
  lerNovoPedido,
  lerRota,
  statusDoErro,
  tipoDaImagem,
} from "../../supabase/functions/sistema-pedidos/logica";

const ID = "50000000-0000-0000-0000-000000000001";
const BASE = "/functions/v1/sistema-pedidos";

describe("SIS-2 · função sistema-pedidos", () => {
  it("rotas: listar, criar, detalhe, mensagem e print; o resto não existe", () => {
    expect(lerRota("GET", `${BASE}/pedidos`)).toEqual({ tipo: "listar" });
    expect(lerRota("POST", `${BASE}/pedidos/`)).toEqual({ tipo: "criar" });
    expect(lerRota("GET", `${BASE}/pedidos/${ID}`)).toEqual({ tipo: "detalhe", pedido: ID });
    expect(lerRota("POST", `${BASE}/pedidos/${ID}/mensagens`)).toEqual({
      tipo: "mensagem",
      pedido: ID,
    });
    expect(lerRota("POST", `${BASE}/pedidos/${ID}/prints`)).toEqual({ tipo: "print", pedido: ID });
    expect(lerRota("DELETE", `${BASE}/pedidos/${ID}`)).toBeNull();
    expect(lerRota("GET", `${BASE}/pedidos/nao-e-id`)).toBeNull();
    expect(lerRota("GET", `${BASE}/outra`)).toBeNull();
  });

  it("chave só no formato certo", () => {
    expect(lerChave(` fdp_${"a".repeat(64)} `)).toBe(`fdp_${"a".repeat(64)}`);
    expect(lerChave("fdp_curta")).toBeNull();
    expect(lerChave(null)).toBeNull();
  });

  it("pedido novo: exige título e quem pediu; limpa o resto", () => {
    expect(lerNovoPedido({ titulo: "x", solicitante: { nome: "A" } })).toEqual({
      erro: "titulo_obrigatorio",
    });
    expect(lerNovoPedido({ titulo: "Fila travou" })).toEqual({ erro: "solicitante_obrigatorio" });
    const ok = lerNovoPedido({
      titulo: "  Fila travou ",
      descricao: "Detalhe",
      tipo: "erro",
      prioridade: "urgente",
      solicitante: { nome: "Cleyde", id: "c1" },
      situacao: "fazendo",
    });
    expect(ok).toMatchObject({
      titulo: "Fila travou",
      tipo: "erro",
      prioridade: "urgente",
      solicitante: { nome: "Cleyde", id: "c1" },
      situacao: null, // situação só vale na importação (com externo_id)
    });
    expect(
      lerNovoPedido({
        titulo: "Velho",
        solicitante: { nome: "A" },
        prioridade: "xx",
        tipo: "outro",
      }),
    ).toMatchObject({ prioridade: "media", tipo: null });
    expect(
      lerNovoPedido({
        titulo: "Importado",
        solicitante: { nome: "A" },
        externo_id: "orga-1",
        situacao: "em_analise",
        criado_em: "2026-10-20T10:00:00Z",
      }),
    ).toMatchObject({
      externo_id: "orga-1",
      situacao: "em_analise",
      criado_em: "2026-10-20T10:00:00Z",
    });
  });

  it("mensagem precisa de autor e texto", () => {
    expect(lerMensagem({ texto: "oi" })).toEqual({ erro: "solicitante_obrigatorio" });
    expect(lerMensagem({ autor_nome: "Ana", texto: "  " })).toEqual({ erro: "texto_obrigatorio" });
    expect(lerMensagem({ autor_nome: "Ana", texto: " oi " })).toEqual({
      autor_nome: "Ana",
      texto: "oi",
      criado_em: null,
    });
  });

  it("print: o tipo vem dos bytes, não do que o chamador diz", () => {
    expect(tipoDaImagem(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))).toBe("image/png");
    expect(tipoDaImagem(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(tipoDaImagem(webp)).toBe("image/webp");
    expect(tipoDaImagem(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });

  it("erros públicos e situação HTTP", () => {
    expect(erroPublico("pedido_inexistente")).toBe("pedido_inexistente");
    expect(statusDoErro("pedido_inexistente")).toBe(404);
    expect(statusDoErro("muitos_pedidos")).toBe(429);
    expect(erroPublico("relation x does not exist")).toBe("falha");
  });
});

describe("SIS-2 · Hub", () => {
  it("origem mostra o nome do sistema", () => {
    expect(origemDoPedido({ origin: "sistema", contexto: null, sistema_nome: "Orga CRM" })).toBe(
      "Sistema · Orga CRM",
    );
    expect(origemDoPedido({ origin: "whatsapp", contexto: null })).toBe("WhatsApp");
  });

  it("endereço da função a partir do Supabase do Hub", () => {
    expect(enderecoDaFuncao("https://abc.supabase.co/")).toBe(
      "https://abc.supabase.co/functions/v1/sistema-pedidos",
    );
  });
});
