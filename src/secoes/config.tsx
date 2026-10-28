import type { Config, CustomField, Fields } from "@puckeditor/core";
import type { CSSProperties, ReactNode } from "react";

import { Capa, type CapaProps } from "./Capa";
import { Chamada, type ChamadaProps } from "./Chamada";
import { Perguntas, type PerguntasProps } from "./Perguntas";
import { Rodape, type RodapeProps } from "./Rodape";
import { TextoImagem, type TextoImagemProps } from "./TextoImagem";
import { coresDoSite, type CorDoSite } from "./tema";

export type Secoes = {
  Capa: CapaProps;
  TextoImagem: TextoImagemProps;
  Perguntas: PerguntasProps;
  Chamada: ChamadaProps;
  Rodape: RodapeProps;
};
export type TipoSecao = keyof Secoes;
export type PropsDaPagina = { titulo: string; cor: CorDoSite };
export type ConfigSecoes = Config<Secoes, PropsDaPagina>;

/** Nome e ajuda de cada seção (lista de "Adicionar seção" e cabeçalho do painel). */
export const sobreAsSecoes: Record<TipoSecao, { nome: string; ajuda: string }> = {
  Capa: { nome: "Capa", ajuda: "Título grande, texto, botão e foto" },
  TextoImagem: { nome: "Texto e foto", ajuda: "Um texto ao lado de uma foto" },
  Perguntas: { nome: "Perguntas frequentes", ajuda: "Perguntas e respostas" },
  Chamada: { nome: "Chamada para ação", ajuda: "Convite com um botão" },
  Rodape: { nome: "Rodapé", ajuda: "Nome, endereço e contatos" },
};
export const tiposDeSecao = Object.keys(sobreAsSecoes) as TipoSecao[];

/**
 * Configuração do Puck com as seções do site. O campo de foto vem de fora (no Hub, "Escolher foto";
 * no site, não é usado). Seções travadas não se movem, não se duplicam e não saem.
 * Os textos de exemplo usam marcadores ([TÍTULO]): o banco não publica com marcador pendente.
 */
export function criarConfigSecoes({
  campoFoto,
  travadas = [],
}: {
  campoFoto: CustomField<string>;
  travadas?: readonly string[];
}): ConfigSecoes {
  const trava = (t: TipoSecao) =>
    travadas.includes(t) ? { permissions: { drag: false, delete: false, duplicate: false } } : {};
  const descricaoFoto = {
    type: "text",
    label: "Descrição da foto (para o Google e leitores de tela)",
  } as const;
  const capa: Fields<CapaProps> = {
    foto: campoFoto,
    descricaoFoto,
    formato: {
      type: "radio",
      label: "Formato",
      options: [
        { label: "Texto e foto", value: "lado" },
        { label: "Centralizado", value: "centro" },
      ],
    },
    chamada: { type: "text", label: "Chamada pequena", contentEditable: true },
    titulo: { type: "textarea", label: "Título", contentEditable: true },
    texto: { type: "textarea", label: "Texto de apoio", contentEditable: true },
    botao: { type: "text", label: "Texto do botão", contentEditable: true },
    link: { type: "text", label: "Link do botão" },
  };
  return {
    root: {
      fields: {
        titulo: { type: "text", label: "Título da página (aba do navegador e Google)" },
        cor: {
          type: "select",
          label: "Cor de destaque do site",
          options: Object.entries(coresDoSite).map(([value, c]) => ({ value, label: c.rotulo })),
        },
      },
      defaultProps: { titulo: "[TÍTULO DA PÁGINA]", cor: "grafite" },
      render: ({ children, cor }: { children: ReactNode; cor?: CorDoSite }) => {
        const c = coresDoSite[cor ?? "grafite"] ?? coresDoSite.grafite;
        return (
          <div
            className="min-h-full bg-white font-sans text-neutral-900 antialiased"
            style={{ "--site-cor": c.cor, "--site-suave": c.suave } as CSSProperties}
          >
            {children}
          </div>
        );
      },
    },
    components: {
      Capa: {
        label: sobreAsSecoes.Capa.nome,
        fields: capa,
        defaultProps: {
          formato: "lado",
          chamada: "",
          titulo: "[TÍTULO DA CAPA]",
          texto: "[TEXTO DE APOIO]",
          botao: "Falar no WhatsApp",
          link: "",
          foto: "",
          descricaoFoto: "",
        },
        render: (p) => <Capa {...p} />,
        ...trava("Capa"),
      },
      TextoImagem: {
        label: sobreAsSecoes.TextoImagem.nome,
        fields: {
          foto: campoFoto,
          descricaoFoto,
          titulo: { type: "text", label: "Título", contentEditable: true },
          texto: { type: "textarea", label: "Texto", contentEditable: true },
          lado: {
            type: "radio",
            label: "Foto",
            options: [
              { label: "À esquerda", value: "esquerda" },
              { label: "À direita", value: "direita" },
            ],
          },
        },
        defaultProps: {
          titulo: "[TÍTULO]",
          texto: "[TEXTO]",
          foto: "",
          descricaoFoto: "",
          lado: "esquerda",
        },
        render: (p) => <TextoImagem {...p} />,
        ...trava("TextoImagem"),
      },
      Perguntas: {
        label: sobreAsSecoes.Perguntas.nome,
        fields: {
          titulo: { type: "text", label: "Título", contentEditable: true },
          itens: {
            type: "array",
            label: "Perguntas",
            getItemSummary: (item) => item.pergunta || "Pergunta",
            defaultItemProps: { pergunta: "[PERGUNTA]", resposta: "[RESPOSTA]" },
            arrayFields: {
              pergunta: { type: "text", label: "Pergunta" },
              resposta: { type: "textarea", label: "Resposta" },
            },
          },
        },
        defaultProps: {
          titulo: "Perguntas frequentes",
          itens: [{ pergunta: "[PERGUNTA]", resposta: "[RESPOSTA]" }],
        },
        render: (p) => <Perguntas {...p} />,
        ...trava("Perguntas"),
      },
      Chamada: {
        label: sobreAsSecoes.Chamada.nome,
        fields: {
          titulo: { type: "text", label: "Título", contentEditable: true },
          texto: { type: "textarea", label: "Texto", contentEditable: true },
          botao: { type: "text", label: "Texto do botão", contentEditable: true },
          link: { type: "text", label: "Link do botão" },
          fundo: {
            type: "radio",
            label: "Fundo",
            options: [
              { label: "Cor do site", value: "cor" },
              { label: "Escuro", value: "escuro" },
            ],
          },
        },
        defaultProps: {
          titulo: "[CHAMADA]",
          texto: "",
          botao: "Falar no WhatsApp",
          link: "",
          fundo: "escuro",
        },
        render: (p) => <Chamada {...p} />,
        ...trava("Chamada"),
      },
      Rodape: {
        label: sobreAsSecoes.Rodape.nome,
        fields: {
          nome: { type: "text", label: "Nome do negócio", contentEditable: true },
          endereco: { type: "text", label: "Endereço", contentEditable: true },
          instagram: { type: "text", label: "Instagram" },
          whatsapp: { type: "text", label: "WhatsApp" },
        },
        defaultProps: { nome: "[NOME DO NEGÓCIO]", endereco: "", instagram: "", whatsapp: "" },
        render: (p) => <Rodape {...p} />,
        ...trava("Rodape"),
      },
    },
  };
}
