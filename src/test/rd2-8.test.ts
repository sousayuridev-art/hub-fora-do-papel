import { describe, expect, it } from "vitest";

import { COM_CLIENTE, LEITURA, conferirEspelho, decidirChamada, lerEspelho } from "@/lib/espelho";
import { fraseDaAtividade, haQuanto, textoDoAviso, type SiteResumo } from "@/lib/sitesHub";

const esp = { clienteId: "c-1", perfil: "responsavel" as const };

describe("RD2-8 · espelho do portal", () => {
  it("sem espelho, tudo passa igual", () => {
    expect(decidirChamada("portal_aprovar", { p_id: "x" }, null)).toEqual({
      tipo: "passar",
      args: { p_id: "x" },
    });
  });
  it("com espelho, gravações são barradas", () => {
    for (const n of [
      "portal_aprovar",
      "portal_pedir_ajuste",
      "portal_adicional_decidir",
      "portal_pedido_criar",
      "portal_contato_respondido",
      "portal_cobranca_avisar",
      "portal_pendencia_feita",
      "portal_arquivo_preparar",
      "site_artigo_salvar",
      "site_pagina_publicar",
      "site_negocio_salvar",
      "portal_visto",
    ])
      expect(decidirChamada(n, {}, esp).tipo).toBe("barrar");
  });
  it("com espelho, leituras passam com o cliente do espelho", () => {
    expect(decidirChamada("portal_inicio", undefined, esp)).toEqual({
      tipo: "passar",
      args: { p_cliente: "c-1" },
    });
    expect(decidirChamada("portal_contatos", { p_site: "s" }, esp)).toEqual({
      tipo: "passar",
      args: { p_site: "s" },
    });
  });
  it("espelho como equipe não abre recibo (valores)", () => {
    expect(decidirChamada("recibo", { p_id: "r" }, { ...esp, perfil: "equipe" }).tipo).toBe(
      "barrar",
    );
    expect(decidirChamada("recibo", { p_id: "r" }, esp).tipo).toBe("passar");
  });
  it("espelho de outra pessoa é apagado ao entrar no portal", () => {
    sessionStorage.setItem(
      "hub-espelho",
      JSON.stringify({
        userId: "dono-1",
        clienteId: "c-1",
        siteId: null,
        perfil: "responsavel",
        empresa: "X",
      }),
    );
    expect(conferirEspelho("cliente-9", false)).toBeNull();
    expect(lerEspelho()).toBeNull();
    sessionStorage.setItem(
      "hub-espelho",
      JSON.stringify({
        userId: "dono-1",
        clienteId: "c-1",
        siteId: null,
        perfil: "responsavel",
        empresa: "X",
      }),
    );
    expect(conferirEspelho("dono-1", true)?.clienteId).toBe("c-1");
    sessionStorage.clear();
  });
  it("nenhuma leitura com cliente fica fora da lista de leitura", () => {
    for (const n of COM_CLIENTE) expect(LEITURA.has(n)).toBe(true);
  });
});

const base: SiteResumo = {
  id: "s",
  nome: "Clínica",
  dominio: "clinica.test",
  client_id: "c",
  empresa: "Clínica",
  logo_path: null,
  no_ar: true,
  modulos: ["paginas"],
  situacao: "no_ar",
  projeto: null,
  capa: null,
  artigos: 0,
  contatos_mes: 0,
  sem_resposta: 0,
  sem_resposta_desde: null,
  publicacoes_cliente_30d: 0,
  ultima_publicacao: null,
  pedidos_abertos: 0,
  pessoas: 1,
  ultimo_acesso: null,
  avisos: [],
};

describe("RD2-8 · textos da central de sites", () => {
  const agora = new Date("2026-11-10T12:00:00Z");
  it("aviso de contato parado vem antes do cliente sumido", () => {
    const s = {
      ...base,
      avisos: ["cliente_sumido", "contato_parado"] as SiteResumo["avisos"],
      sem_resposta: 2,
      sem_resposta_desde: "2026-11-06T12:00:00Z",
    };
    expect(textoDoAviso(s, agora)).toEqual({
      texto: "2 contatos sem resposta há 4 dias",
      tom: "risco",
    });
  });
  it("cliente que nunca entrou", () => {
    expect(textoDoAviso({ ...base, avisos: ["cliente_sumido"] }, agora)?.texto).toMatch(
      /Ninguém da empresa/,
    );
  });
  it("há quanto tempo", () => {
    expect(haQuanto(null, agora)).toBe("—");
    expect(haQuanto("2026-11-10T08:00:00Z", agora)).toBe("Hoje");
    expect(haQuanto("2026-11-05T08:00:00Z", agora)).toBe("há 5 dias");
  });
  it("frase da atividade", () => {
    expect(
      fraseDaAtividade({
        evento: "site.artigo_publicado",
        quando: "",
        quem: "cliente",
        nome: "Marta",
        titulo: "Exame de vista",
        caminho: null,
      }),
    ).toBe("Marta publicou o artigo “Exame de vista”");
    expect(
      fraseDaAtividade({
        evento: "site.pagina_publicada",
        quando: "",
        quem: "dono",
        nome: "Yuri",
        titulo: null,
        caminho: "/exames",
      }),
    ).toBe("Você publicou a página /exames");
  });
});
