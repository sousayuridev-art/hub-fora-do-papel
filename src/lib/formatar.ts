/** Formatação em português do Brasil (valores em centavos, datas no fuso da agência). */

const moedaFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

/** 1250000 → "R$ 12.500" */
export function moeda(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return moedaFmt.format(cents / 100).replace(/\u00a0/g, " ");
}

/** "R$ 12.500" ou "12500" → 1250000. Vazio → null. */
export function centavosDoTexto(texto: string): number | null {
  const limpo = texto.replace(/[^\d,]/g, "").replace(",", ".");
  if (!limpo) return null;
  const valor = Number(limpo);
  return Number.isFinite(valor) ? Math.round(valor * 100) : null;
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
