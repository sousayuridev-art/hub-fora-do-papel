import { supabase } from "@/lib/supabase";

/** Agenda da semana em Reuniões (card RD2-3): eventos da Google Agenda ligados ao que o Hub sabe. */

export type Convidado = { email: string; nome?: string };

export type EventoAgenda = {
  id: string;
  titulo: string;
  inicio: string;
  fim: string;
  dia_inteiro: boolean;
  meet: string | null;
  local: string | null;
  convidados: Convidado[];
};

export type LigacaoEvento = {
  reuniao_id: string | null;
  reuniao_situacao: "aguardando_transcricao" | "transcrita" | "sem_transcricao" | null;
  cliente: { id: string; nome: string; contato: string } | null;
  deal: {
    id: string;
    etapa: "contato" | "diagnostico" | "mapeamento" | "proposta" | "fechado";
    valor_cents: number | null;
    proximo_passo: string | null;
    quando: string | null;
  } | null;
  proposta: {
    status: "rascunho" | "enviada" | "aceita" | "recusada";
    versao: number;
    enviada_em: string | null;
    vista_em: string | null;
    total_cents: number | null;
  } | null;
  ultima_reuniao: string | null;
};

export type Agenda = {
  ligada: boolean;
  eventos: EventoAgenda[];
  ligacoes: Record<string, LigacaoEvento>;
};

export type NovaReuniao = {
  titulo: string;
  inicio: string;
  fim: string;
  convidados: string[];
  descricao?: string;
};

export const chavesAgenda = {
  tudo: ["agenda"] as const,
  semana: (segunda: string) => ["agenda", "semana", segunda] as const,
};

/** Segunda-feira (00:00, hora local) da semana da data. */
export function segundaDa(data: Date): Date {
  const d = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  const dia = d.getDay(); // 0 = domingo
  d.setDate(d.getDate() - (dia === 0 ? 6 : dia - 1));
  return d;
}

/** Semana que a agenda abre: a desta semana; no sábado e no domingo, a próxima. */
export function semanaParaAbrir(hoje: Date): Date {
  const s = segundaDa(hoje);
  if (hoje.getDay() === 0 || hoje.getDay() === 6) s.setDate(s.getDate() + 7);
  return s;
}

/** Segunda a sexta da semana que começa em `segunda`. */
export function diasUteis(segunda: Date): Date[] {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(segunda);
    d.setDate(segunda.getDate() + i);
    return d;
  });
}

/** "2026-11-02" (data local, para o endereço e para as chaves). */
export function dataIso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dia}`;
}

/** "2026-11-02" → Date local (00:00). Inválido → null. */
export function deDataIso(texto: string | undefined): Date | null {
  if (!texto || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
  const [a, m, d] = texto.split("-").map(Number);
  const data = new Date(a ?? 0, (m ?? 1) - 1, d ?? 1);
  return Number.isNaN(data.getTime()) ? null : data;
}

/** "2 a 6 de novembro de 2026" / "30 de outubro a 3 de novembro de 2026" */
export function rotuloSemanaUtil(segunda: Date): string {
  const sexta = new Date(segunda);
  sexta.setDate(segunda.getDate() + 4);
  const mes = (d: Date) => new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(d);
  if (segunda.getMonth() === sexta.getMonth())
    return `${segunda.getDate()} a ${sexta.getDate()} de ${mes(sexta)} de ${sexta.getFullYear()}`;
  const anoIni =
    segunda.getFullYear() !== sexta.getFullYear() ? ` de ${segunda.getFullYear()}` : "";
  return `${segunda.getDate()} de ${mes(segunda)}${anoIni} a ${sexta.getDate()} de ${mes(sexta)} de ${sexta.getFullYear()}`;
}

export function mesmoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Horas da grade: 8h às 18h, alargando para caber reuniões mais cedo ou mais tarde. */
export function horasDaGrade(eventos: EventoAgenda[]): { de: number; ate: number } {
  let de = 8;
  let ate = 18;
  for (const e of eventos) {
    if (e.dia_inteiro) continue;
    const i = new Date(e.inicio);
    const f = new Date(e.fim);
    de = Math.min(de, i.getHours());
    ate = Math.max(ate, f.getHours() + (f.getMinutes() > 0 ? 1 : 0));
  }
  return { de: Math.max(0, de), ate: Math.min(24, Math.max(ate, de + 1)) };
}

export type Bloco = {
  evento: EventoAgenda;
  topo: number;
  altura: number;
  coluna: number;
  colunas: number;
};

/**
 * Posição de cada reunião do dia na grade (em minutos a partir de `de` horas).
 * Reuniões que se sobrepõem dividem a largura, lado a lado, como na Google Agenda.
 */
export function blocosDoDia(eventos: EventoAgenda[], dia: Date, de: number): Bloco[] {
  const doDia = eventos
    .filter((e) => !e.dia_inteiro && mesmoDia(new Date(e.inicio), dia))
    .map((e) => {
      const i = new Date(e.inicio);
      const f = new Date(e.fim);
      const ini = (i.getHours() - de) * 60 + i.getMinutes();
      const fim = Math.max(
        ini + 15,
        (f.getHours() - de) * 60 + f.getMinutes() + (mesmoDia(f, dia) ? 0 : 24 * 60),
      );
      return { evento: e, ini, fim };
    })
    .sort((a, b) => a.ini - b.ini || b.fim - a.fim);

  const saida: Bloco[] = [];
  let grupo: { evento: EventoAgenda; ini: number; fim: number; coluna: number }[] = [];
  let fimGrupo = -1;
  const fechar = () => {
    const n = Math.max(1, ...grupo.map((g) => g.coluna + 1));
    for (const g of grupo)
      saida.push({
        evento: g.evento,
        topo: g.ini,
        altura: g.fim - g.ini,
        coluna: g.coluna,
        colunas: n,
      });
    grupo = [];
  };
  for (const e of doDia) {
    if (grupo.length && e.ini >= fimGrupo) fechar();
    const ocupadas = new Set(grupo.filter((g) => g.fim > e.ini).map((g) => g.coluna));
    let coluna = 0;
    while (ocupadas.has(coluna)) coluna++;
    grupo.push({ ...e, coluna });
    fimGrupo = Math.max(fimGrupo, e.fim);
  }
  if (grupo.length) fechar();
  return saida;
}

// ---------------------------------------------------------------------
// Rede
// ---------------------------------------------------------------------
async function funcao<T>(rota: "agenda" | "marcar", corpo: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(`reunioes-google/${rota}`, {
    method: "POST",
    body: corpo,
  });
  if (error) {
    const resposta: unknown = await (error as { context?: Response }).context
      ?.json?.()
      .catch(() => null);
    const msg =
      resposta && typeof resposta === "object" && "erro" in resposta
        ? String(resposta.erro)
        : error.message;
    throw new Error(msg);
  }
  return data as T;
}

/** Eventos da semana (segunda 00:00 até sábado 00:00) já ligados a clientes do Hub. */
export async function carregarSemana(segunda: Date): Promise<Agenda> {
  const sabado = new Date(segunda);
  sabado.setDate(segunda.getDate() + 5);
  const r = await funcao<{ ligada: boolean; eventos: EventoAgenda[] }>("agenda", {
    inicio: segunda.toISOString(),
    fim: sabado.toISOString(),
  });
  if (!r.ligada || r.eventos.length === 0)
    return { ligada: r.ligada, eventos: r.eventos, ligacoes: {} };
  const { data, error } = await supabase.rpc("agenda_ligar", {
    p_eventos: r.eventos.map((e) => ({ id: e.id, emails: e.convidados.map((c) => c.email) })),
  });
  if (error) throw error;
  return {
    ligada: true,
    eventos: r.eventos,
    ligacoes: (data ?? {}) as Record<string, LigacaoEvento>,
  };
}

export function marcarReuniao(dados: NovaReuniao) {
  return funcao<{ evento: EventoAgenda | null }>("marcar", dados);
}

/** Mensagens das recusas da função, em português simples. */
export function mensagemDaAgenda(e: unknown): string {
  const t = e instanceof Error ? e.message : "";
  const mapa: Record<string, string> = {
    titulo_obrigatorio: "Dê um título para a reunião.",
    horario_invalido: "Confira a data, a hora e a duração (até 8 horas).",
    convidados_demais: "Até 30 convidados por reunião.",
    google_desligado: "Ligue o Google em Configurações para marcar reuniões.",
    janela_invalida: "Semana inválida. Volte para hoje e tente de novo.",
  };
  return (
    mapa[t] ??
    (t && !/^[a-z_]+$/.test(t) ? t : "Não foi possível falar com o Google. Tente de novo.")
  );
}
