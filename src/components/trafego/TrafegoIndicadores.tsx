import { moeda } from "@/lib/formatar";
import { rotuloPlataforma, type PainelTrafego } from "@/lib/trafego";

/** Os 4 números do período: investido, contatos, custo por contato, custo por diagnóstico vendido. */
export function TrafegoIndicadores({ p }: { p: PainelTrafego }) {
  const i = p.indicadores;
  const plat = (id: "google" | "meta") => p.por_plataforma.find((x) => x.plataforma === id);
  const g = plat("google");
  const m = plat("meta");
  const cartoes = [
    {
      rotulo: "Investido no período",
      valor: moeda(i.investido_cents),
      nota: `${rotuloPlataforma.google} ${moeda(g?.investido_cents ?? 0)} · ${rotuloPlataforma.meta} ${moeda(m?.investido_cents ?? 0)}.`,
    },
    {
      rotulo: "Contatos vindos de anúncio",
      valor: String(i.contatos),
      nota: `${rotuloPlataforma.meta} ${m?.contatos ?? 0} · Google ${g?.contatos ?? 0}.`,
    },
    {
      rotulo: "Custo por contato",
      valor: i.custo_contato_cents == null ? "—" : moeda(i.custo_contato_cents),
      nota:
        i.custo_contato_cents == null
          ? "Aparece quando houver contato de anúncio."
          : `Google ${g?.custo_contato_cents == null ? "—" : moeda(g.custo_contato_cents)} · ${rotuloPlataforma.meta} ${m?.custo_contato_cents == null ? "—" : moeda(m.custo_contato_cents)}.`,
    },
    {
      rotulo: "Custo por diagnóstico vendido",
      valor: i.custo_diagnostico_cents == null ? "—" : moeda(i.custo_diagnostico_cents),
      nota:
        i.diagnosticos === 0
          ? "Nenhum diagnóstico pago vindo de anúncio no período."
          : `${i.diagnosticos} ${i.diagnosticos === 1 ? "diagnóstico vendido" : "diagnósticos vendidos"}, ${moeda(i.receita_diagnosticos_cents)}.`,
    },
  ];
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cartoes.map((c) => (
        <div
          key={c.rotulo}
          className="flex flex-col gap-1 rounded-2xl border border-hub-borda bg-white p-5"
        >
          <dt className="text-[14px] text-hub-suave">{c.rotulo}</dt>
          <dd className="font-titulo text-[28px] font-bold tabular-nums">{c.valor}</dd>
          <dd className="text-[13.5px] text-hub-suave">{c.nota}</dd>
        </div>
      ))}
    </dl>
  );
}
