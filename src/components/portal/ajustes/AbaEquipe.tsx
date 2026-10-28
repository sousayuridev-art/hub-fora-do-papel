import { Link } from "@tanstack/react-router";

import type { PessoaEquipe } from "@/lib/ajustesSite";

/** Quem da empresa tem acesso ao painel (só leitura nesta entrega). */
export function AbaEquipe({ equipe }: { equipe: PessoaEquipe[] }) {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <ul className="divide-y divide-hub-borda overflow-hidden rounded-2xl border border-hub-borda bg-white">
        {equipe.map((p) => (
          <li key={p.email} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3">
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[15px] font-medium">{p.nome ?? p.email}</span>
              {p.nome && <span className="truncate text-[13.5px] text-hub-suave">{p.email}</span>}
            </span>
            <span className="shrink-0 rounded-full bg-hub-fundo px-3 py-1 text-[13px]">
              {p.perfil === "responsavel" ? "Responsável pelo contrato" : "Equipe"}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[14.5px] text-hub-suave">
        Para incluir alguém, peça à Fora do Papel.{" "}
        <Link
          to="/portal/pedidos"
          search={{ novo: 1 }}
          className="font-medium text-[#1E3FA8] underline"
        >
          Fazer o pedido
        </Link>
      </p>
    </div>
  );
}
