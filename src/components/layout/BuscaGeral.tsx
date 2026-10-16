import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { menuOperador } from "@/components/layout/navegacao";
import { chavesClientes, listarClientes } from "@/lib/funil";

/** Busca geral (Ctrl K): clientes pelo nome ou pessoa e atalhos do menu. */
export function BuscaGeral({
  aberta,
  aoMudar,
}: {
  aberta: boolean;
  aoMudar: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const clientes = useQuery({
    queryKey: chavesClientes.lista,
    queryFn: listarClientes,
    enabled: aberta,
  });

  function ir(para: string, params?: { id: string }) {
    aoMudar(false);
    if (params) void navigate({ to: "/app/clientes/$id", params });
    else void navigate({ to: para });
  }

  return (
    <CommandDialog open={aberta} onOpenChange={aoMudar}>
      <CommandInput placeholder="Buscar cliente, contato ou tela…" />
      <CommandList>
        <CommandEmpty>
          {clientes.isPending
            ? "Carregando…"
            : clientes.isError
              ? "Não foi possível buscar."
              : "Nada encontrado."}
        </CommandEmpty>
        {(clientes.data?.length ?? 0) > 0 && (
          <CommandGroup heading="Clientes e contatos">
            {clientes.data?.slice(0, 200).map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.company_name} ${c.contact_name} ${c.email ?? ""}`}
                onSelect={() => ir("", { id: c.id })}
                className="min-h-11"
              >
                <span className="font-medium">{c.company_name}</span>
                <span className="text-hub-suave">· {c.contact_name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Telas">
          {menuOperador
            .flatMap((g) => g.itens)
            .map((item) => (
              <CommandItem
                key={item.para}
                value={item.rotulo}
                onSelect={() => ir(item.para)}
                className="min-h-11"
              >
                <item.icone className="size-4" aria-hidden="true" />
                {item.rotulo}
              </CommandItem>
            ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
