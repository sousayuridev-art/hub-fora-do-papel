import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Globe, Home, Menu, MessagesSquare, Plus, type LucideIcon } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { AcaoRapida, GrupoPortal, SecaoPortal } from "@/components/layout/navegacao";
import { useAbrirAcao } from "@/components/portal/useAbrirAcao";
import type { PendenciasPortal } from "@/hooks/usePendenciasPortal";
import { cn } from "@/lib/utils";

type Gaveta = "site" | "criar" | "clientes" | "mais" | null;

const classeAba =
  "group flex min-h-[52px] flex-col items-center justify-center gap-1 text-[12.5px] font-medium tracking-tight text-hub-suave";

function IconeAba({ icone: Icone, total }: { icone: LucideIcon; total: number }) {
  return (
    <span className="relative flex h-7 w-[52px] items-center justify-center rounded-full transition-colors group-active:bg-[#E9E9E3] group-aria-[current=page]:bg-[#F1F1EC] group-aria-expanded:bg-[#F1F1EC]">
      <Icone className="size-5" aria-hidden="true" />
      {total > 0 && (
        <span
          className="absolute -top-1 right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-hub-destaque px-1 text-[12.5px] font-bold tabular-nums text-hub-tinta ring-2 ring-white"
          aria-label={`${total} pendentes`}
        >
          {total}
        </span>
      )}
    </span>
  );
}

function LinhaGaveta({
  item,
  total,
  aoIr,
}: {
  item: SecaoPortal;
  total: number;
  aoIr: () => void;
}) {
  const Icone = item.icone;
  const conteudo = (
    <>
      <Icone className="size-5 shrink-0 text-hub-suave" aria-hidden="true" />
      <span className="flex-1">{item.rotulo}</span>
      {item.emBreve ? (
        <span className="rounded-full bg-[#F1F1EC] px-2 py-0.5 text-[12.5px] text-hub-suave">
          Em breve
        </span>
      ) : total > 0 ? (
        <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-hub-destaque px-1.5 text-[12.5px] font-semibold tabular-nums text-hub-tinta">
          {total}
        </span>
      ) : null}
    </>
  );
  const classe = "flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium";
  if (item.emBreve)
    return (
      <span aria-disabled="true" className={cn(classe, "text-hub-suave")}>
        {conteudo}
      </span>
    );
  return (
    <Link
      to={item.para}
      onClick={aoIr}
      className={cn(classe, "hover:bg-hub-fundo active:bg-[#E9E9E3]")}
    >
      {conteudo}
    </Link>
  );
}

/**
 * Abas do painel no celular quando a empresa tem site (card PC-1):
 * Início, Meu site, Criar (central), Contatos e Mais. O resto do menu abre em painel de baixo.
 * "Mais" leva o selo de Aprovações e Pagamentos, para a soma bater com "Precisa da sua atenção".
 */
export function PortalTabsSite({
  grupos,
  selos,
  acoes,
}: {
  grupos: GrupoPortal[];
  selos: PendenciasPortal;
  acoes: AcaoRapida[];
}) {
  const [gaveta, setGaveta] = useState<Gaveta>(null);
  const navigate = useNavigate();
  const abrir = useAbrirAcao(() => void navigate({ to: "/portal/pedidos", search: { novo: 1 } }));
  const grupo = (t: string) => grupos.find((g) => g.titulo === t);
  const site = grupo("Meu site");
  const clientes = grupo("Clientes");
  const mais = grupos.filter(
    (g) => g.titulo !== "Meu site" && g.titulo !== "Clientes" && g.itens[0]?.para !== "/portal",
  );
  const selosMais = mais
    .flatMap((g) => g.itens)
    .reduce((n, i) => n + (i.selo ? selos[i.selo] : 0), 0);
  const fechar = () => setGaveta(null);

  const conteudo: Record<Exclude<Gaveta, null>, { titulo: string; grupos: GrupoPortal[] }> = {
    site: { titulo: "Meu site", grupos: site ? [{ ...site, titulo: null }] : [] },
    clientes: { titulo: "Clientes", grupos: clientes ? [{ ...clientes, titulo: null }] : [] },
    mais: { titulo: "Mais", grupos: mais },
    criar: { titulo: "Criar", grupos: [] },
  };
  const aberta = gaveta ? conteudo[gaveta] : null;

  const botaoAba = (id: Exclude<Gaveta, null>, rotulo: string, icone: LucideIcon, total = 0) => (
    <button
      type="button"
      className={classeAba}
      aria-expanded={gaveta === id}
      aria-haspopup="dialog"
      onClick={() => setGaveta(id)}
    >
      <IconeAba icone={icone} total={total} />
      {rotulo}
    </button>
  );

  return (
    <>
      <nav
        aria-label="Seções do painel"
        className="barra-fixa fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-hub-borda bg-white px-1 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-16px_rgba(14,16,19,0.18)] md:hidden"
      >
        <Link
          to="/portal"
          activeOptions={{ exact: true }}
          className={classeAba}
          activeProps={{ className: "text-hub-tinta font-semibold", "aria-current": "page" }}
        >
          <IconeAba icone={Home} total={selos.inicio} />
          Início
        </Link>
        {botaoAba("site", "Meu site", Globe)}
        <button
          type="button"
          className={cn(classeAba, "text-hub-tinta")}
          aria-expanded={gaveta === "criar"}
          aria-haspopup="dialog"
          onClick={() => setGaveta("criar")}
        >
          <span className="botao-degrade flex size-11 -mt-3 items-center justify-center rounded-full text-hub-tinta shadow-[0_8px_18px_-8px_rgba(255,176,32,0.8)]">
            <Plus className="size-5" strokeWidth={2.4} aria-hidden="true" />
          </span>
          Criar
        </button>
        {botaoAba("clientes", "Contatos", MessagesSquare)}
        {botaoAba("mais", "Mais", Menu, selosMais)}
      </nav>

      <Sheet open={gaveta !== null} onOpenChange={(v) => !v && fechar()}>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] overflow-y-auto rounded-t-[24px] px-4 pt-5 pb-[calc(16px+env(safe-area-inset-bottom))]"
        >
          <SheetTitle className="text-[20px] font-bold">{aberta?.titulo}</SheetTitle>
          <SheetDescription className="sr-only">Escolha para onde ir</SheetDescription>
          {gaveta === "criar" ? (
            <div className="mt-3 flex flex-col gap-1">
              {acoes.map((a) => {
                const Icone = a.icone;
                const classe =
                  "flex min-h-12 items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium";
                return a.emBreve ? (
                  <span key={a.id} aria-disabled="true" className={cn(classe, "text-hub-suave")}>
                    <Icone className="size-5 shrink-0" aria-hidden="true" />
                    <span className="flex-1">{a.rotulo}</span>
                    <span className="rounded-full bg-[#F1F1EC] px-2 py-0.5 text-[12.5px]">
                      Em breve
                    </span>
                  </span>
                ) : (
                  <button
                    key={a.id}
                    type="button"
                    className={cn(classe, "hover:bg-hub-fundo active:bg-[#E9E9E3]")}
                    onClick={() => {
                      fechar();
                      abrir(a);
                    }}
                  >
                    <Icone className="size-5 shrink-0 text-hub-suave" aria-hidden="true" />
                    <span className="flex-1">{a.rotulo}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-4">
              {aberta?.grupos.map((g, i) => (
                <div key={g.titulo ?? `g-${i}`} className="flex flex-col gap-1">
                  {g.titulo && (
                    <span className="px-3 text-[13px] font-semibold text-hub-suave">
                      {g.titulo}
                    </span>
                  )}
                  {g.itens.map((item) => (
                    <LinhaGaveta
                      key={item.para}
                      item={item}
                      total={item.selo ? selos[item.selo] : 0}
                      aoIr={fechar}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
