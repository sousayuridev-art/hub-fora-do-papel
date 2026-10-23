/** Formatação em português do Brasil (valores em centavos, datas no fuso da agência). */

const moedaInteira = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const moedaCentavos = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1250000 → "R$ 12.500"; 4990 → "R$ 49,90" (centavos só quando existem). */
export function moeda(cents: number | null | undefined): string {
  if (cents == null) return "—";
  const fmt = cents % 100 === 0 ? moedaInteira : moedaCentavos;
  return fmt.format(cents / 100).replace(/\u00a0/g, " ");
}

/**
 * Número digitado do jeito brasileiro: "1.200" = mil e duzentos, "1.200,50", "12,5", "300".
 * Ponto seguido de exatamente 3 dígitos é separador de milhar; vírgula é decimal. Vazio → null.
 */
export function numeroBR(texto: string): number | null {
  let t = texto.replace(/[^\d,.-]/g, "");
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Maior parte inteira aceita num campo de dinheiro (dígitos). Acima disso o texto é recusado. */
export const DIGITOS_MAX_DINHEIRO = 12;

export type OpcoesDinheiro = {
  /** Aceita "-" no começo. */
  permitirNegativo?: boolean;
  /**
   * A pessoa está apagando: ponto no fim é só o milhar que sobrou ("9.00" depois de apagar
   * um zero de "9.000"), não decimal.
   */
  apagando?: boolean;
};

const agruparMilhar = (digitos: string) => digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/**
 * Texto do campo de dinheiro enquanto a pessoa digita ou cola, sem o "R$":
 * "9000" → "9.000"; "9000,5" → "9.000,5"; ",5" → "0,5"; "R$ 9.000,50" → "9.000,50";
 * "9000.50" → "9.000,50" (ponto com 1 ou 2 dígitos no fim é decimal; com 3, milhar).
 * Vírgula vale uma vez, com até 2 casas; letras são ignoradas. Vazio → "".
 * Parte inteira com mais de 12 dígitos → null (o campo recusa e mantém o texto anterior).
 */
export function textoDinheiroDigitando(texto: string, opcoes: OpcoesDinheiro = {}): string | null {
  let limpo = texto.replace(/[^\d,.-]/g, "");
  const negativo = !!opcoes.permitirNegativo && limpo.startsWith("-");
  limpo = limpo.replace(/-/g, "");

  let separador = limpo.indexOf(",");
  if (separador < 0 && !opcoes.apagando) {
    const m = /\.\d{0,2}$/.exec(limpo);
    if (m) separador = m.index;
  }
  const inteiroCru = (separador < 0 ? limpo : limpo.slice(0, separador)).replace(/\D/g, "");
  const decimais =
    separador < 0
      ? ""
      : limpo
          .slice(separador + 1)
          .replace(/\D/g, "")
          .slice(0, 2);

  let inteiro = inteiroCru.replace(/^0+(?=\d)/, "");
  if (inteiro.length > DIGITOS_MAX_DINHEIRO) return null;
  if (!inteiro && separador >= 0) inteiro = "0";
  const sinal = negativo ? "-" : "";
  if (!inteiro) return sinal;
  return `${sinal}${agruparMilhar(inteiro)}${separador >= 0 ? `,${decimais}` : ""}`;
}

/** Ao sair do campo: completa as 2 casas ("9.000" → "9.000,00"; "0,5" → "0,50"). Vazio fica vazio. */
export function textoDinheiroCompleto(texto: string, opcoes: OpcoesDinheiro = {}): string {
  const t = textoDinheiroDigitando(texto, opcoes) ?? "";
  if (!t || t === "-") return "";
  const [inteiro, decimais = ""] = t.split(",");
  return `${inteiro},${decimais.padEnd(2, "0")}`;
}

/** Centavos vindos do banco → texto do campo: 900050 → "9.000,50"; null → "". */
export function textoDinheiroDeCentavos(cents: number | null | undefined): string {
  if (cents == null) return "";
  const abs = Math.abs(Math.round(cents));
  const reais = agruparMilhar(String(Math.floor(abs / 100)));
  return `${cents < 0 ? "-" : ""}${reais},${String(abs % 100).padStart(2, "0")}`;
}

/**
 * "R$ 9.000,50", "9000.50" → 900050; "9.000", "9000" → 900000; "" → null.
 * Mesmas regras do campo (ponto com 3 dígitos é milhar; com 1 ou 2 no fim é decimal).
 * Número negativo só com `permitirNegativo`; parte inteira acima de 12 dígitos → null.
 */
export function centavosDoTexto(texto: string, opcoes: OpcoesDinheiro = {}): number | null {
  const t = textoDinheiroDigitando(texto, { permitirNegativo: !!opcoes.permitirNegativo });
  if (!t || t === "-") return null;
  const negativo = t.startsWith("-");
  const [inteiro = "0", decimais = ""] = t.replace("-", "").replace(/\./g, "").split(",");
  const cents = Number(inteiro) * 100 + Number(decimais.padEnd(2, "0"));
  return negativo ? -cents : cents;
}

/**
 * Onde o cursor fica depois de formatar: conta os dígitos antes dele no texto digitado e
 * para depois do mesmo número de dígitos no texto formatado (o ponto de milhar não empurra
 * o cursor para o fim). Se a vírgula estava antes do cursor, ele fica depois dela.
 */
export function posicaoCursorDinheiro(
  cru: string,
  cursor: number,
  formatado: string,
  opcoes: OpcoesDinheiro = {},
): number {
  const antes = textoDinheiroDigitando(cru.slice(0, cursor), opcoes) ?? "";
  const alvo = antes.replace(/\D/g, "").length;
  const passouVirgula = antes.includes(",") && formatado.includes(",");
  let pos = 0;
  let digitos = 0;
  while (pos < formatado.length && digitos < alvo) {
    if (/\d/.test(formatado[pos] ?? "")) digitos++;
    pos++;
  }
  if (alvo === 0 && antes.startsWith("-") && formatado.startsWith("-")) pos = 1;
  const virgula = formatado.indexOf(",");
  if (passouVirgula && virgula >= 0 && pos <= virgula) pos = virgula + 1;
  return pos;
}

const diaMesFmt = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "2-digit" });
const semanaFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });
const horaFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** "AAAA-MM-DD" → Date no meio do dia (evita virar o dia por fuso). */
export function dataLocal(iso: string): Date {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a ?? 1970, (m ?? 1) - 1, d ?? 1, 12);
}

/** Date → "AAAA-MM-DD" (data local). */
export function isoDoDia(data: Date): string {
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${m}-${d}`;
}

/** 16/10 */
export function diaMes(data: Date | string): string {
  return diaMesFmt.format(typeof data === "string" ? new Date(data) : data);
}

/** "15h" ou "10h30" */
export function hora(data: Date | string): string {
  const [h, m] = horaFmt.format(typeof data === "string" ? new Date(data) : data).split(":");
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

/** "sex 16/10, 10h" */
export function diaComHora(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return `${semanaFmt.format(d).replace(".", "")} ${diaMes(d)}, ${hora(d)}`;
}

export type Prazo = { texto: string; tom: "risco" | "atencao" | "neutro" };

/**
 * Quando é o próximo passo, em relação a hoje (datas "AAAA-MM-DD" do banco, já no fuso da agência).
 * Vencido em vermelho, hoje em âmbar, futuro neutro.
 */
export function prazoRelativo(dataIso: string, hojeIso: string, horaIso?: string | null): Prazo {
  const dia = dataLocal(dataIso);
  const hoje = dataLocal(hojeIso);
  const diff = Math.round((dia.getTime() - hoje.getTime()) / 86_400_000);
  const comHora = horaIso ? `, ${hora(horaIso)}` : "";
  if (diff < 0) {
    const quando = diff === -1 ? "ontem" : `há ${-diff} dias`;
    return { texto: `Venceu ${quando}, ${diaMes(dia)}`, tom: "risco" };
  }
  if (diff === 0) return { texto: `Hoje${comHora}`, tom: "atencao" };
  if (diff === 1) return { texto: `Amanhã, ${diaMes(dia)}${comHora}`, tom: "neutro" };
  return { texto: `${diaMes(dia)}${comHora}`, tom: "neutro" };
}

/** "Clínica Sorriso Leve" → "CS" */
export function sigla(nome: string): string {
  const palavras = nome
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((p) => p.length > 1 || /\d/.test(p));
  return ((palavras[0]?.[0] ?? "") + (palavras[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** Link do WhatsApp com DDI 55 quando faltar. */
export function linkWhatsapp(numero: string | null | undefined): string | null {
  const digitos = (numero ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return null;
  return `https://wa.me/${digitos.startsWith("55") && digitos.length > 11 ? digitos : `55${digitos}`}`;
}

/** "79900000001" → "(79) 9 0000-0001" (sem mudar o que já vier formatado de outro jeito). */
export function telefone(numero: string | null | undefined): string {
  const d = (numero ?? "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d[2]} ${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return numero ?? "";
}

/** Resultado com sinal: "+ R$ 6.420" ou "− R$ 300". */
export const moedaComSinal = (cents: number) =>
  cents > 0 ? `+ ${moeda(cents)}` : cents < 0 ? `− ${moeda(-cents)}` : moeda(0);
