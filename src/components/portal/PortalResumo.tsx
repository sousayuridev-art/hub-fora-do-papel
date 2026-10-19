import { Link } from "@tanstack/react-router";

import type { PendenciasDoPortal } from "@/lib/portal";

/** Bloco escuro do Início: os 3 números somam o "Precisa de você" (mesma conta dos selos). */
export function PortalResumo({ p }: { p: PendenciasDoPortal }) {
  const itens = [
    {
      n: p.aprovacoes,
      rotulo: p.aprovacoes === 1 ? "aprovação" : "aprovações",
      para: "/portal/aprovacoes" as const,
    },
    {
      n: p.pendencias,
      rotulo: p.pendencias === 1 ? "pendência" : "pendências",
      para: "/portal" as const,
      hash: "precisa",
    },
    {
      n: p.pagamentos,
      rotulo: p.pagamentos === 1 ? "conta a pagar" : "contas a pagar",
      para: "/portal/pagamentos" as const,
    },
  ];
  return (
    <section aria-label="Resumo" className="rounded-3xl bg-hub-tinta p-5 text-white md:p-7">
      <p className="text-[15px] text-[#C9CBD0]">
        {p.total === 0
          ? "Nada depende de você agora."
          : `Precisa de você: ${p.total} ${p.total === 1 ? "item" : "itens"}`}
      </p>
      <ul className="mt-4 grid grid-cols-3 gap-2 md:gap-4">
        {itens.map((i) => (
          <li key={i.rotulo}>
            <Link
              to={i.para}
              {...(i.hash ? { hash: i.hash } : {})}
              className="flex min-h-11 flex-col gap-1 rounded-2xl bg-white/5 p-3 hover:bg-white/10 md:p-4"
            >
              <strong className="font-titulo text-[28px] font-bold leading-none tabular-nums md:text-[36px]">
                {i.n}
              </strong>
              <span className="text-[13px] leading-snug text-[#C9CBD0] md:text-[14px]">
                {i.rotulo}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {p.pedidos_andamento > 0 && (
        <Link
          to="/portal/pedidos"
          className="mt-3 inline-flex min-h-11 items-center text-[14px] text-[#C9CBD0] underline-offset-4 hover:underline"
        >
          Acompanhando: {p.pedidos_andamento}{" "}
          {p.pedidos_andamento === 1 ? "pedido em andamento" : "pedidos em andamento"}
        </Link>
      )}
    </section>
  );
}
