import { describe, expect, it } from "vitest";

import { linkDePrimeiroAcesso, mensagemDoAcesso } from "@/lib/acessoPortal";
import { mensagemConvite } from "@/lib/mensagens";
import { caminhoInterno } from "@/lib/volta";
import {
  erroPublico,
  lerPedido,
  linkDaResposta,
  origemPermitida,
  tipoDoLink,
} from "../../supabase/functions/portal-acesso/logica";

const HASH = "a".repeat(56);
const CONTA = "00000000-0000-0000-0000-0000000000c1";

describe("SEG-2 · função portal-acesso", () => {
  it("aceita só cliente (uuid) e e-mail válido, e normaliza o e-mail", () => {
    expect(
      lerPedido({ cliente: "20000000-0000-0000-0000-000000000001", email: " Marta@Clinica.COM " }),
    ).toEqual({ cliente: "20000000-0000-0000-0000-000000000001", email: "marta@clinica.com" });
    expect(lerPedido({ cliente: "x", email: "marta@clinica.com" })).toBeNull();
    expect(
      lerPedido({ cliente: "20000000-0000-0000-0000-000000000001", email: "marta" }),
    ).toBeNull();
    expect(lerPedido(null)).toBeNull();
  });

  it("conta nova recebe convite; conta sem senha que já existe recebe link mágico", () => {
    expect(tipoDoLink(false)).toBe("invite");
    expect(tipoDoLink(true)).toBe("magiclink");
  });

  it("da resposta do Auth sai só o token, o tipo e o id da conta (nunca o código de 6 dígitos)", () => {
    const r = linkDaResposta({
      id: CONTA,
      email: "m@c.com",
      action_link: "https://x/verify?token=...",
      email_otp: "123456",
      hashed_token: HASH,
      verification_type: "invite",
    });
    expect(r).toEqual({ token_hash: HASH, tipo: "invite", usuario: CONTA });
    expect(JSON.stringify(r)).not.toContain("123456");
    expect(
      linkDaResposta({
        user: { id: CONTA },
        properties: { hashed_token: HASH, verification_type: "magiclink" },
      }),
    ).toEqual({ token_hash: HASH, tipo: "magiclink", usuario: CONTA });
    // Sem o id da conta, o link não sai (não dá para prender a conta ao tenant)
    expect(linkDaResposta({ hashed_token: HASH, verification_type: "invite" })).toBeNull();
    expect(
      linkDaResposta({ id: CONTA, hashed_token: HASH, verification_type: "recovery" }),
    ).toBeNull();
    expect(
      linkDaResposta({ id: CONTA, hashed_token: "<script>", verification_type: "invite" }),
    ).toBeNull();
  });

  it("erros do banco viram códigos públicos; recusas têm uma resposta só", () => {
    expect(erroPublico("usar_entrada")).toBe("usar_entrada");
    expect(erroPublico("conta_de_outro")).toBe("usar_entrada");
    expect(erroPublico("ja_tem_senha")).toBe("falha");
    expect(erroPublico("precisa_codigo")).toBe("precisa_codigo");
    expect(erroPublico("tenant_ambiguo")).toBe("sem_permissao");
    expect(erroPublico('relation "x" does not exist')).toBe("falha");
  });

  it("só as origens do Hub chamam a função", () => {
    expect(origemPermitida("https://spring-board-kit.lovable.app")).toBe(true);
    expect(origemPermitida("https://hub.foradopapel.com.br")).toBe(true);
    expect(origemPermitida("https://foradopapel.com.br.malicioso.com")).toBe(false);
    expect(origemPermitida(null)).toBe(false);
  });
});

describe("SEG-2 · link e mensagem", () => {
  it("o link volta pelo callback e cai em Crie sua senha, com volta interna válida", () => {
    const l = new URL(linkDePrimeiroAcesso("https://spring-board-kit.lovable.app", HASH, "invite"));
    expect(l.pathname).toBe("/auth/callback");
    expect(l.searchParams.get("token_hash")).toBe(HASH);
    expect(l.searchParams.get("type")).toBe("invite");
    const volta = l.searchParams.get("volta");
    expect(volta).toBe("/entrar/senha?tipo=primeiro");
    expect(caminhoInterno.parse(volta)).toBe(volta);
  });

  it("convite com link: cria a senha pelo link e depois entra com e-mail e senha", () => {
    const m = mensagemConvite({
      contato: "Marta Souza",
      remetente: "Yuri",
      empresa: "Clínica",
      email: "marta@clinica.com",
      portal: "https://x/portal",
      link: "https://x/auth/callback?token_hash=abc",
    });
    expect(m.whatsapp).toContain("Crie sua senha por este link");
    expect(m.whatsapp).toContain("https://x/auth/callback?token_hash=abc");
    expect(m.whatsapp).toContain("marta@clinica.com");
    expect(m.whatsapp).not.toMatch(/sem senha|não tem senha/i);
    expect(m.email).toContain("Crie sua senha por este link");
  });

  it("convite sem link: indica o caminho da tela de entrada", () => {
    const m = mensagemConvite({
      contato: null,
      remetente: "Yuri",
      empresa: "Clínica",
      email: "marta@clinica.com",
      portal: "https://x/portal",
    });
    expect(m.whatsapp).toContain("Primeiro acesso ou esqueceu a senha?");
    expect(m.whatsapp).toContain("https://x/portal");
  });

  it("erros novos têm texto em português", () => {
    expect(mensagemDoAcesso(new Error("usar_entrada"))).toMatch(/tela de entrada/);
    expect(mensagemDoAcesso(new Error("sem_convite"))).toMatch(/Convide/);
  });
});
