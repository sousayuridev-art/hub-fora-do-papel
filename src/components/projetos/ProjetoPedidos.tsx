import { Link } from "@tanstack/react-router";

import { Selo } from "@/components/hub/Selo";
import { diaMes, moeda } from "@/lib/formatar";
import {
  proximoPasso,
  rotuloClassificacao,
  rotuloSituacaoPedido,
  tomSituacaoPedido,
  type Pedido,
} from "@/lib/pedidos";

/** Pedidos ligados ao projeto. As ações ficam em Pedidos (um lugar só). */
export function ProjetoPedidos({ pedidos }: { pedidos: Pedido[] }) {
  if (pedidos.length === 0)
    return (
      <p className="rounded-2xl border border-hub-borda bg-white p-5 text-[15px] text-hub-suave">
        Nenhum pedido neste projeto. Pedidos do cliente (portal, WhatsApp ou reunião) entram em
        Pedidos.
      </p>
    );
  return (
    <ul className="flex flex-col rounded-2xl border border-hub-borda bg-white">
      {pedidos.map((p) => (
        <li key={p.id} className="border-b border-hub-borda last:border-b-0">
          <Link
            to="/app/pedidos"
            search={{ pedido: p.id }}
            className="flex min-h-14 flex-col gap-1 px-5 py-3 hover:bg-hub-fundo sm:flex-row sm:items-center sm:gap-4"
          >
            <span className="w-14 shrink-0 font-rotulo text-[13px] text-hub-suave">{p.code}</span>
            <span className="min-w-0 flex-1 font-medium">{p.title}</span>
            <span className="text-[13.5px] text-hub-suave">
              {p.classification ? rotuloClassificacao[p.classification] : "Sem classificação"}
              {p.value_cents ? ` · ${moeda(p.value_cents)}` : ""} · {diaMes(p.created_at)}
            </span>
            <span className="flex items-center gap-2">
              <Selo tom={tomSituacaoPedido[p.status]}>{rotuloSituacaoPedido[p.status]}</Selo>
              <span className="text-[13px] text-hub-suave max-sm:hidden">{proximoPasso(p)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
