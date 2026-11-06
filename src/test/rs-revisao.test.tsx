import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EnviarRevisao } from "@/components/portal/revisao/EnviarRevisao";
import { PreviaPagina } from "@/components/portal/revisao/PreviaPagina";
import type { DadosPagina } from "@/lib/paginasCliente";
import { origemDoPedido } from "@/lib/pedidos";
import {
  mensagemDaRevisao,
  oQueFalta,
  posicaoNaSecao,
  problemaDaFoto,
  prontoParaAprovar,
  textoDoToque,
  tipoDoAudio,
  type AjusteEnviado,
  type SituacaoAjuste,
} from "@/lib/revisao";

const ajuste = (situacao: SituacaoAjuste): AjusteEnviado => ({
  id: crypto.randomUUID(),
  codigo: "RM-01",
  ordem: 1,
  tipo: "texto",
  pagina: "Página inicial",
  secao: "Capa",
  posicao: null,
  antes: null,
  depois: "Novo título",
  descricao: null,
  situacao,
  nota: null,
  refeito_vezes: 0,
  validado_em: null,
  pronto_em: null,
  foto: null,
  conversa: [],
});

const pagina: DadosPagina = {
  root: { props: { titulo: "Início", cor: "oceano" } },
  content: [
    {
      type: "Capa",
      props: {
        id: "Capa-1",
        formato: "centro",
        chamada: "",
        titulo: "Móveis sob medida para a sua casa",
        texto: "Cozinhas e quartos.",
        botao: "Pedir orçamento",
        link: "https://wa.me/5579",
        foto: "",
        descricaoFoto: "",
      },
    },
  ],
};

describe("RS · revisar o site", () => {
  it("posição do toque em porcentagem da seção, presa entre 0 e 1", () => {
    const caixa = { left: 100, top: 200, width: 400, height: 200 };
    expect(posicaoNaSecao({ x: 300, y: 250 }, caixa)).toEqual({ x: 0.5, y: 0.25 });
    expect(posicaoNaSecao({ x: 50, y: 900 }, caixa)).toEqual({ x: 0, y: 1 });
  });

  it("guarda o texto tocado limpo e curto", () => {
    expect(textoDoToque("  Móveis \n sob   medida ")).toBe("Móveis sob medida");
    expect(textoDoToque("")).toBeNull();
    expect(textoDoToque("a".repeat(400))?.length).toBe(298);
  });

  it("foto: só JPG, PNG ou WebP até 5 MB, recusada antes do envio", () => {
    const f = (tipo: string, tamanho: number) =>
      new File([new Uint8Array(tamanho)], "foto", { type: tipo });
    expect(problemaDaFoto(f("image/jpeg", 1000))).toBeNull();
    expect(problemaDaFoto(f("image/gif", 1000))).toMatch(/JPG, PNG ou WebP/);
    expect(problemaDaFoto(f("image/png", 6 * 1024 * 1024))).toMatch(/5 MB/);
  });

  it("áudio do navegador sem o codec", () => {
    expect(tipoDoAudio("audio/webm;codecs=opus")).toBe("audio/webm");
    expect(tipoDoAudio("audio/mp4")).toBe("audio/mp4");
    expect(tipoDoAudio("video/webm")).toBeNull();
  });

  it("aprovar o site só com tudo fechado; o que falta em frase curta", () => {
    const r = (sits: SituacaoAjuste[]) => ({
      aprovado_em: null,
      rodadas: [{ id: "1", numero: 1, enviada_em: "", ajustes: sits.map(ajuste) }],
    });
    expect(prontoParaAprovar(r(["aprovado", "recusado"]))).toBe(true);
    expect(prontoParaAprovar(r(["aprovado", "para_ver"]))).toBe(false);
    expect(prontoParaAprovar({ aprovado_em: null, rodadas: [] })).toBe(true);
    expect(oQueFalta(r(["para_ver", "para_ver", "orcamento", "fazendo"]))).toBe(
      "2 ajustes para você ver · 1 orçamento para aprovar · 1 ajuste sendo feito",
    );
  });

  it("erros do banco em português", () => {
    expect(mensagemDaRevisao({ message: "limite_refacao" })).toMatch(/refeito duas vezes/);
    expect(mensagemDaRevisao({ message: "so_responsavel" })).toMatch(/responsável pelo contrato/);
    expect(mensagemDaRevisao({ message: "outra coisa" })).toBeNull();
  });

  it("Hub mostra a origem como revisão e página", () => {
    expect(origemDoPedido({ origin: "revisao", contexto: { revisao: 2, pagina: "Contato" } })).toBe(
      "Revisão 2 · Contato",
    );
  });

  it("tocar na prévia marca a seção, guarda o texto e não navega", () => {
    const aoTocar = vi.fn();
    render(
      <PreviaPagina
        dados={pagina}
        pinos={[{ numero: 1, secaoId: "Capa-1", posicao: { x: 0.5, y: 0.5 } }]}
        aoTocar={aoTocar}
      />,
    );
    expect(screen.getByText("1")).toBeTruthy();
    const link = screen.getByText("Pedir orçamento");
    const evento = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(true);
    fireEvent.click(screen.getByText("Móveis sob medida para a sua casa"));
    expect(aoTocar).toHaveBeenLastCalledWith(
      expect.objectContaining({
        secaoId: "Capa-1",
        secao: "Capa",
        antes: "Móveis sob medida para a sua casa",
      }),
    );
  });

  it("da 3ª revisão em diante, o envio avisa que é provável serviço adicional", () => {
    render(
      <EnviarRevisao
        aberto
        aoMudar={() => {}}
        total={2}
        numero={3}
        incluidas={2}
        enviando={false}
        aoEnviar={() => {}}
      />,
    );
    expect(screen.getByText(/provavelmente serão serviço adicional/)).toBeTruthy();
    expect(screen.getByText("Enviar 2 ajustes?")).toBeTruthy();
  });
});
