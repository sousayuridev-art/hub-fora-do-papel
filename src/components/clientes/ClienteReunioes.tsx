import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { ReuniaoPainel } from "@/components/reunioes/ReuniaoPainel";
import { ReunioesLista } from "@/components/reunioes/ReunioesLista";
import { chavesReunioes, listarReunioes, type Reuniao } from "@/lib/reunioes";

/** Aba "Reuniões" da ficha do cliente (card RE-1). */
export function ClienteReunioes({ clienteId }: { clienteId: string }) {
  const [aberta, setAberta] = useState<Reuniao | null>(null);
  const lista = useQuery({
    queryKey: chavesReunioes.lista("todas", clienteId),
    queryFn: () => listarReunioes("todas", clienteId),
  });

  if (lista.isPending)
    return <div className="h-64 animate-pulse rounded-2xl bg-white" aria-busy="true" />;
  if (lista.isError) {
    return (
      <EstadoErro
        titulo="Não foi possível carregar as reuniões"
        aoTentarDeNovo={() => void lista.refetch()}
      />
    );
  }
  return (
    <>
      {lista.data.itens.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
          Nenhuma reunião ligada a este cliente ainda. Convide pelo e-mail que está na ficha para
          ela entrar sozinha.
        </p>
      ) : (
        <ReunioesLista itens={lista.data.itens} aoAbrir={setAberta} mostrarCliente={false} />
      )}
      <ReuniaoPainel reuniao={aberta} aoFechar={() => setAberta(null)} />
    </>
  );
}
