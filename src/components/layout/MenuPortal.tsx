import { Link } from "@tanstack/react-router";
import { ExternalLink, RotateCw } from "lucide-react";

import { ContaUsuario } from "@/components/layout/ContaUsuario";
import { SimboloPapel } from "@/components/layout/Marca";
import type { GrupoPortal, SecaoPortal } from "@/components/layout/navegacao";
import type { PendenciasPortal } from "@/hooks/usePendenciasPortal";
import type { SitePortal } from "@/lib/sitesCliente";
import { cn } from "@/lib/utils";

const classeItem =
  "group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] font-medium text-menu-texto transition-colors";

function ItemPortal({ item, total }: { item: SecaoPortal; total: number }) {
  const Icone = item.icone;
  // Tela ainda não construída (PC-3 a PC-6): aparece, mas não leva a lugar nenhum
  if (item.emBreve)
    return (
      <span aria-disabled="true" className={cn(classeItem, "cursor-default text-[#8E929A]")}>
        <Icone className="size-5 shrink-0 text-[#6F737B]" strokeWidth={1.8} aria-hidden="true" />
        <span className="min-w-0 flex-1 leading-tight">{item.rotulo}</span>
        <span className="shrink-0 rounded-full bg-white/8 px-2 py-0.5 text-[12.5px] font-medium text-[#A9ADB5]">
          Em breve
        </span>
      </span>
    );
  return (
    <Link
      to={item.para}
      activeOptions={{ exact: item.exato ?? false }}
      className={cn(
        classeItem,
        "hover:bg-menu-hover hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB020]",
      )}
      activeProps={{
        className:
          "!bg-menu-ativo !text-hub-tinta font-semibold shadow-[0_6px_16px_-8px_rgb(255_176_32_/_0.7)]",
        "aria-current": "page",
      }}
    >
      {({ isActive }) => (
        <>
          <Icone
            className={`size-5 shrink-0 ${isActive ? "text-menu-icone" : "text-[#B4B8BF] group-hover:text-white"}`}
            strokeWidth={isActive ? 2.1 : 1.8}
            aria-hidden="true"
          />
          <span className="flex-1 truncate">{item.rotulo}</span>
          {total > 0 && (
            <span
              className={
                isActive
                  ? "flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-hub-tinta px-1.5 text-[12.5px] font-semibold tabular-nums text-white"
                  : "flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[#FFB020] px-1.5 text-[12.5px] font-semibold tabular-nums text-hub-tinta"
              }
              aria-label={`${total} ${total === 1 ? "pendente" : "pendentes"}`}
            >
              {total}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

/**
 * Menu lateral do painel do cliente no computador (card PC-1, igual ao do Hub: HUB-VIS-2).
 * Nome dos grupos em frase normal (páginas do cliente não usam caixa alta).
 */
export function MenuPortal({
  grupos,
  selos,
  empresa,
  site,
  perfil,
  falhou,
  aoTentarDeNovo,
}: {
  grupos: GrupoPortal[];
  selos: PendenciasPortal;
  empresa: string;
  site: SitePortal | null;
  perfil: "responsavel" | "equipe" | null;
  falhou: boolean;
  aoTentarDeNovo: () => void;
}) {
  return (
    <div className="menu-marca flex h-full flex-col text-menu-texto">
      <div className="flex flex-col gap-4 px-4 pb-3 pt-5">
        <Link
          to="/portal"
          aria-label="Fora do Papel · ir para o Início"
          className="flex min-h-11 items-center gap-2.5 self-start rounded-lg pl-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB020]"
        >
          <SimboloPapel tamanho={30} />
          <span className="font-marca text-[18px] font-extrabold leading-none tracking-[-0.02em] text-[#F5F5F2]">
            Fora do Papel
          </span>
        </Link>
        <div className="flex flex-col gap-0.5 rounded-xl bg-white/[0.06] px-3 py-2.5 ring-1 ring-white/8">
          <span className="truncate text-[14px] font-semibold text-white">{empresa}</span>
          {site ? (
            <a
              href={`https://${site.dominio}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-6 items-center gap-1.5 truncate text-[13px] text-[#C9CBD0] hover:text-white"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  site.no_ar ? "bg-[#3BB273]" : "bg-[#9A9DA3]",
                )}
              />
              <span className="truncate">{site.dominio}</span>
              <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="sr-only">(abre o site em outra aba)</span>
            </a>
          ) : (
            <span className="text-[13px] text-[#A9ADB5]">Painel do cliente</span>
          )}
        </div>
      </div>

      <nav
        aria-label="Painel"
        className="rolagem-discreta flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-3"
      >
        {falhou && (
          <div
            role="status"
            className="flex flex-col gap-2 rounded-xl bg-white/[0.06] p-3 text-[13.5px]"
          >
            Não conseguimos carregar o menu do seu site.
            <button
              type="button"
              onClick={aoTentarDeNovo}
              className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg px-2 font-semibold text-[#FFB020] hover:bg-white/10"
            >
              <RotateCw className="size-4" aria-hidden="true" /> Tentar de novo
            </button>
          </div>
        )}
        {grupos.map((grupo, i) => (
          <div key={grupo.titulo ?? `solto-${i}`} className="flex flex-col gap-1">
            {grupo.titulo && (
              <span className="px-3 pb-1 text-[13px] font-semibold text-menu-rotulo">
                {grupo.titulo}
              </span>
            )}
            {grupo.itens.map((item) => (
              <ItemPortal key={item.para} item={item} total={item.selo ? selos[item.selo] : 0} />
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-3">
        <ContaUsuario
          cartao
          saida="/entrar"
          legenda={perfil === "responsavel" ? "Responsável pelo contrato" : "Equipe"}
        />
      </div>
    </div>
  );
}
