import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { itemConfiguracoes, menuOperador, type ItemMenu } from "@/components/layout/navegacao";
import { ContaUsuario } from "@/components/layout/ContaUsuario";
import { SimboloPapel } from "@/components/layout/Marca";
import { cn } from "@/lib/utils";
import { chavesTarefas, resumoTarefas } from "@/lib/tarefas";

/** Tarefas atrasadas (do banco; o mesmo número do atalho "Atrasadas" da Central sem filtros). */
function useContador(tipo: ItemMenu["contador"]): number | null {
  const q = useQuery({
    queryKey: chavesTarefas.resumo(),
    queryFn: () => resumoTarefas(),
    enabled: tipo === "tarefas_atrasadas",
    staleTime: 60_000,
  });
  return tipo === "tarefas_atrasadas" ? (q.data?.atrasadas ?? null) : null;
}

const classeAtivo =
  "!bg-menu-ativo !text-hub-tinta font-semibold shadow-[0_6px_16px_-8px_rgb(255_176_32_/_0.7)]";

const classeItem =
  "group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] font-medium text-menu-texto transition-colors hover:bg-menu-hover hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB020]";

function LinkMenu({
  item,
  aoNavegar,
  recolhido = false,
}: {
  item: ItemMenu;
  aoNavegar?: (() => void) | undefined;
  recolhido?: boolean;
}) {
  const Icone = item.icone;
  const contador = useContador(item.contador);
  const caminho = useRouterState({ select: (r) => r.location.pathname });
  // Rotas que pertencem a este item sem estar no endereço dele (ex.: Propostas em Vendas, RD2-2)
  const extra = item.tambem?.some((p) => caminho === p || caminho.startsWith(`${p}/`)) ?? false;
  return (
    <Link
      to={item.para}
      activeOptions={{ exact: item.exato ?? false }}
      onClick={aoNavegar}
      className={cn(classeItem, recolhido && "relative justify-center px-0", extra && classeAtivo)}
      title={recolhido ? item.rotulo : undefined}
      aria-label={recolhido ? item.rotulo : undefined}
      aria-current={extra ? "page" : undefined}
      activeProps={{ className: classeAtivo, "aria-current": "page" }}
    >
      {({ isActive: ativoPeloEndereco }) => {
        const isActive = ativoPeloEndereco || extra;
        return (
          <>
            <Icone
              className={`size-5 shrink-0 ${isActive ? "text-menu-icone" : "text-[#B4B8BF] group-hover:text-white"}`}
              strokeWidth={isActive ? 2.1 : 1.8}
              aria-hidden="true"
            />
            {!recolhido && <span className="flex-1 truncate">{item.rotulo}</span>}
            {contador && recolhido ? (
              <span
                className="absolute right-1.5 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#FFB020] px-1 text-[11px] font-bold tabular-nums text-hub-tinta"
                aria-label={`${contador} ${contador === 1 ? "atrasada" : "atrasadas"}`}
              >
                {contador}
              </span>
            ) : contador ? (
              <span
                className={
                  isActive
                    ? "flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-hub-tinta px-1.5 text-[12.5px] font-semibold tabular-nums text-white"
                    : "flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[#FFB020]/15 px-1.5 text-[12.5px] font-semibold tabular-nums text-[#FFB020]"
                }
                aria-label={`${contador} ${contador === 1 ? "atrasada" : "atrasadas"}`}
              >
                {contador}
              </span>
            ) : null}
            {item.emBreve && !recolhido && (
              <span
                className={
                  isActive
                    ? "rounded-full bg-hub-tinta/10 px-2 py-0.5 text-[12.5px] font-medium text-hub-tinta"
                    : "rounded-full bg-white/8 px-2 py-0.5 text-[12.5px] font-medium text-[#A9ADB5]"
                }
              >
                Em breve
              </span>
            )}
          </>
        );
      }}
    </Link>
  );
}

/**
 * Menu do operador (HUB-VIS-2): escuro na cor da marca, item ativo em âmbar.
 * Usado na lateral (computador) e na gaveta (celular).
 */
export function MenuOperador({
  aoNavegar,
  recolhido = false,
  aoRecolher,
}: {
  aoNavegar?: (() => void) | undefined;
  /** Só ícones (computador). */
  recolhido?: boolean;
  /** Botão de recolher/abrir; ausente na gaveta do celular. */
  aoRecolher?: (() => void) | undefined;
}) {
  // A barra de rolagem só aparece enquanto a pessoa rola o menu.
  const [rolando, setRolando] = useState(false);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Em telas baixas, o item ativo (ex.: Financeiro) pode ficar abaixo da dobra: leva até ele.
  const navRef = useRef<HTMLElement>(null);
  const caminho = useRouterState({ select: (r) => r.location.pathname });
  useEffect(() => {
    const ativo = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    ativo?.scrollIntoView({ block: "nearest" });
  }, [caminho]);
  const aoRolar = () => {
    setRolando(true);
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = setTimeout(() => setRolando(false), 900);
  };

  const IconeRecolher = recolhido ? PanelLeftOpen : PanelLeftClose;
  return (
    <div className="menu-marca flex h-full flex-col text-menu-texto">
      <div
        className={cn(
          "flex items-center gap-2 pb-3 pt-5",
          recolhido ? "flex-col px-3" : "justify-between pl-5 pr-3",
        )}
      >
        <Link
          to="/app"
          onClick={aoNavegar}
          aria-label="Fora do Papel · ir para o Painel"
          className="flex min-h-11 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB020]"
        >
          <SimboloPapel tamanho={30} />
          {!recolhido && (
            <span className="font-marca text-[18px] font-extrabold leading-none tracking-[-0.02em] text-[#F5F5F2]">
              Fora do Papel
            </span>
          )}
        </Link>
        {aoRecolher && (
          <button
            type="button"
            onClick={aoRecolher}
            aria-label={recolhido ? "Abrir o menu" : "Recolher o menu"}
            title={recolhido ? "Abrir o menu" : "Recolher o menu"}
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-[#B4B8BF] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB020]"
          >
            <IconeRecolher className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>
      <nav
        ref={navRef}
        aria-label="Menu principal"
        onScroll={aoRolar}
        data-rolando={rolando}
        className={cn(
          "rolagem-discreta flex flex-1 flex-col gap-4 overflow-y-auto py-3",
          recolhido ? "px-3" : "px-4",
        )}
      >
        {menuOperador.map((grupo) => (
          <div key={grupo.titulo ?? "inicio"} className="flex flex-col gap-1">
            {grupo.titulo &&
              (recolhido ? (
                <span aria-hidden="true" className="mx-2 mb-1 h-px bg-white/10" />
              ) : (
                <span className="px-3 pb-1 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-menu-rotulo">
                  {grupo.titulo}
                </span>
              ))}
            {grupo.itens.map((item) => (
              <LinkMenu key={item.para} item={item} aoNavegar={aoNavegar} recolhido={recolhido} />
            ))}
          </div>
        ))}
      </nav>
      <div
        className={cn(
          "flex flex-col gap-2 border-t border-white/10 py-3",
          recolhido ? "px-3" : "px-4",
        )}
      >
        <LinkMenu item={itemConfiguracoes} aoNavegar={aoNavegar} recolhido={recolhido} />
        <ContaUsuario cartao compacto={recolhido} />
      </div>
    </div>
  );
}
