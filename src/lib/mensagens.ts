import { moeda } from "@/lib/formatar";

/**
 * Mensagens prontas para o cliente (card CX-1), num lugar só, com a voz da Fora do Papel:
 * WhatsApp curto (nome, uma linha de contexto, link, próximo passo) e e-mail com assunto que diz
 * o conteúdo, resumo em tópicos e próximo passo. Sem emoji no e-mail; no máximo uma exclamação.
 * A nota pessoal do Yuri entra logo depois da saudação, nos dois canais.
 */

export type Mensagem = { whatsapp: string; assunto: string; email: string };

type Base = {
  /** Nome completo ou primeiro nome de quem recebe; usamos só o primeiro. */
  contato: string | null;
  /** Primeiro nome de quem envia (o Yuri). Vazio vira "a equipe". */
  remetente: string;
  /** Nota pessoal opcional, escrita na hora de enviar. */
  nota?: string | undefined;
};

const primeiro = (nome: string | null) => (nome ?? "").trim().split(/\s+/)[0] ?? "";

function saudacaoZap(b: Base): string {
  const n = primeiro(b.contato);
  const quem = b.remetente ? `o ${b.remetente}` : "a equipe";
  return `Oi${n ? `, ${n}` : ""}! Aqui é ${quem}, da Fora do Papel.`;
}

function saudacaoEmail(b: Base): string {
  const n = primeiro(b.contato);
  return n ? `Olá, ${n}.` : "Olá.";
}

function assinatura(b: Base): string {
  return b.remetente ? `${b.remetente}\nFora do Papel` : "Equipe Fora do Papel";
}

function nota(b: Base): string[] {
  const t = (b.nota ?? "").trim();
  return t ? [t] : [];
}

function montar(b: Base, zap: string[], assunto: string, corpo: string[]): Mensagem {
  return {
    whatsapp: [saudacaoZap(b), ...nota(b), ...zap].join("\n"),
    assunto,
    email: [
      saudacaoEmail(b),
      "",
      ...nota(b),
      ...(nota(b).length ? [""] : []),
      ...corpo,
      "",
      assinatura(b),
    ].join("\n"),
  };
}

/** 1. Proposta pronta. */
export function mensagemProposta(
  b: Base & {
    empresa: string;
    titulo: string | null;
    link: string;
    validade: string | null;
    totalCents: number | null;
    parcelas: number;
  },
): Mensagem {
  const doQue = b.titulo ? `de ${b.titulo.toLowerCase()}` : `para a ${b.empresa}`;
  return montar(
    b,
    [
      `Sua proposta ${doQue} está pronta. Dá para ler no celular em uns 5 minutos:`,
      b.link,
      b.validade
        ? `Ela vale até ${b.validade}. Se quiser, a gente passa por ela juntos numa ligação rápida.`
        : "Se quiser, a gente passa por ela juntos numa ligação rápida.",
    ],
    `Sua proposta: ${b.titulo ? `${b.titulo} da ${b.empresa}` : b.empresa}`,
    [
      `Preparamos a proposta ${doQue}, a partir do que conversamos.`,
      "",
      ...(b.totalCents
        ? [
            `- Investimento: ${moeda(b.totalCents)}${b.parcelas > 1 ? ` em ${b.parcelas} parcelas` : ""}`,
          ]
        : []),
      ...(b.validade ? [`- Validade: até ${b.validade}`] : []),
      "",
      `Ver a proposta: ${b.link}`,
      "",
      "O aceite é feito na própria página. Qualquer dúvida, é só responder este e-mail.",
    ],
  );
}

/** 2. Convite do portal. */
export function mensagemConvite(
  b: Base & { empresa: string; email: string; portal: string },
): Mensagem {
  return montar(
    b,
    [
      "Seu portal já está pronto. Por lá você acompanha o projeto, aprova cada entrega e faz pedidos de ajuste:",
      b.portal,
      `Use o e-mail ${b.email}. Não tem senha: o acesso chega por e-mail.`,
    ],
    `Seu portal da ${b.empresa} está pronto`,
    [
      "A partir de hoje, tudo do projeto fica em um lugar só:",
      "",
      "- o que precisa de você, em destaque",
      "- aprovações com seu nome, data e hora",
      "- pedidos de ajuste e arquivos",
      "",
      `Entrar no portal: ${b.portal}`,
      "",
      `Use o e-mail ${b.email}. O link de acesso vale por 1 hora; depois, é só pedir outro na tela de entrada.`,
    ],
  );
}

/** 3. Entrega para aprovar (uma só). */
export function mensagemEntrega(
  b: Base & { titulo: string; conferir: string | null; link: string },
): Mensagem {
  return montar(
    b,
    [
      `${b.titulo} está pronta para você ver.`,
      ...(b.conferir ? [`Confira: ${b.conferir}`] : []),
      b.link,
      "Se estiver tudo certo, é só aprovar por lá. Se não, peça o ajuste na mesma tela.",
    ],
    `Para aprovar: ${b.titulo}`,
    [
      `${b.titulo} está pronta para sua aprovação.`,
      "",
      ...(b.conferir ? [`- O que conferir: ${b.conferir}`, ""] : []),
      `Ver e decidir: ${b.link}`,
    ],
  );
}

/** 4. Serviço adicional para decidir (nunca começa sem aprovação). */
export function mensagemAdicional(
  b: Base & { titulo: string; valorCents: number | null; link: string },
): Mensagem {
  return montar(
    b,
    [
      `O pedido "${b.titulo}" não estava na proposta.`,
      "Preparei o orçamento como serviço adicional, para você decidir com calma:",
      b.link,
      "Nada começa sem a sua aprovação.",
    ],
    `Serviço adicional para aprovar: ${b.titulo}`,
    [
      `O pedido "${b.titulo}" não fazia parte da proposta. Preparamos o orçamento:`,
      "",
      ...(b.valorCents ? [`- Valor: ${moeda(b.valorCents)}`] : []),
      "",
      `Ver o serviço adicional: ${b.link}`,
      "",
      "Nada é feito ou cobrado sem a sua aprovação.",
    ],
  );
}

/** Vários itens esperando no portal (lembrete). */
export function mensagemLembrete(b: Base & { itens: string[]; link: string }): Mensagem {
  const quantos = b.itens.length === 1 ? "1 item espera" : `${b.itens.length} itens esperam`;
  return montar(
    b,
    [`No seu portal, ${quantos} por você:`, ...b.itens.map((i) => `• ${i}`), b.link],
    b.itens.length === 1
      ? `Para você ver: ${b.itens[0]}`
      : `${b.itens.length} itens esperam por você no portal`,
    [
      `No seu portal, ${quantos} por você:`,
      "",
      ...b.itens.map((i) => `- ${i}`),
      "",
      `Abrir o portal: ${b.link}`,
    ],
  );
}

/** 5. Cobrança: antes do vencimento, no dia ou atrasada. Valor e Pix ficam no portal. */
export function mensagemCobranca(
  b: Base & {
    descricao: string;
    valorCents: number;
    vencimento: string | null;
    diasAtraso: number;
    hoje: boolean;
    link: string;
  },
): Mensagem {
  const valor = moeda(b.valorCents);
  const linha =
    b.diasAtraso > 0
      ? `A cobrança "${b.descricao}", de ${valor}, venceu em ${b.vencimento ?? ""}.`
      : b.hoje
        ? `Só lembrando: "${b.descricao}", de ${valor}, vence hoje.`
        : `"${b.descricao}", de ${valor}${b.vencimento ? `, vence em ${b.vencimento}` : ""}.`;
  return montar(
    b,
    [linha, "O Pix já está com o valor preenchido no seu portal:", b.link],
    `${b.descricao}: ${valor}${b.vencimento ? `, ${b.diasAtraso > 0 ? "venceu em" : "vence em"} ${b.vencimento}` : ""}`,
    [
      `- Cobrança: ${b.descricao}`,
      `- Valor: ${valor}`,
      ...(b.vencimento ? [`- Vencimento: ${b.vencimento}`] : []),
      "",
      `Pagar pelo Pix: ${b.link}`,
      "",
      "O recibo aparece no portal em até 1 dia útil depois do pagamento.",
    ],
  );
}

/** Recibo pronto (depois do pagamento conferido). */
export function mensagemRecibo(b: Base & { descricao: string; link: string }): Mensagem {
  const n = primeiro(b.contato);
  return {
    whatsapp: [
      `Recebemos "${b.descricao}"${n ? `, ${n}` : ""}. Obrigado.`,
      ...nota(b),
      `O recibo já está no portal: ${b.link}`,
    ].join("\n"),
    assunto: `Recibo: ${b.descricao}`,
    email: [
      saudacaoEmail(b),
      "",
      `Recebemos o pagamento de "${b.descricao}". Obrigado.`,
      "",
      `Ver o recibo: ${b.link}`,
      "",
      assinatura(b),
    ].join("\n"),
  };
}

/** Link mailto: com assunto e corpo (o e-mail sai do aplicativo de e-mail de quem envia). */
export function linkEmail(para: string | null, m: Mensagem): string | null {
  if (!para || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(para.trim())) return null;
  return `mailto:${encodeURIComponent(para.trim())}?subject=${encodeURIComponent(m.assunto)}&body=${encodeURIComponent(m.email)}`;
}
