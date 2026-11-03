import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Copy, ExternalLink, ImagePlus, Trash2 } from "lucide-react";

import { CapaDoSistema } from "@/components/sistemas/CapaDoSistema";
import { classeAcaoTexto, classeBotaoSecundario } from "@/lib/estilos";
import { diaMes, moeda } from "@/lib/formatar";
import { erro, mensagemDeErro, ok } from "@/lib/notify";
import {
  chavesSistemas,
  enviarCapa,
  mensagemDoSistema,
  textoDoAvisoSistema,
  tirarCapa,
  type SistemaResumo,
} from "@/lib/sistemas";
import { cn } from "@/lib/utils";

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-hub-borda py-3 last:border-0 sm:flex-row sm:gap-4">
      <dt className="w-44 shrink-0 text-[13.5px] text-hub-suave">{rotulo}</dt>
      <dd className="min-w-0 text-[15px]">{children}</dd>
    </div>
  );
}

function Endereco({ url }: { url: string | null }) {
  if (!url) return <span className="text-hub-suave">Não cadastrado</span>;
  return (
    <span className="flex min-w-0 items-center gap-1">
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex min-h-11 min-w-0 items-center gap-1.5 truncate underline underline-offset-4 md:min-h-0"
      >
        <span className="truncate">{url.replace(/^https:\/\//, "")}</span>
        <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
      </a>
      <button
        type="button"
        aria-label="Copiar o endereço"
        className="grid size-11 shrink-0 place-items-center rounded-lg text-hub-suave hover:bg-hub-fundo md:size-8"
        onClick={() =>
          void navigator.clipboard
            ?.writeText(url)
            .then(() => ok("Endereço copiado."))
            .catch(() => erro("Não foi possível copiar."))
        }
      >
        <Copy className="size-4" aria-hidden="true" />
      </button>
    </span>
  );
}

/** Visão geral do sistema (SIS-1): print da tela, avisos, dados e ligação com cliente e projeto. */
export function SistemaVisaoGeral({ s, capa }: { s: SistemaResumo; capa: string | undefined }) {
  const qc = useQueryClient();
  const arquivo = useRef<HTMLInputElement>(null);
  const recarregar = () => void qc.invalidateQueries({ queryKey: chavesSistemas.resumo });
  const enviar = useMutation({
    mutationFn: (f: File) => enviarCapa(s, f),
    onSuccess: () => ok("Imagem da tela salva."),
    onError: (e) => erro(mensagemDoSistema(e) ?? mensagemDeErro(e)),
    onSettled: recarregar,
  });
  const tirar = useMutation({
    mutationFn: () => tirarCapa(s.id),
    onSuccess: () => ok("Imagem tirada."),
    onError: (e) => erro(mensagemDoSistema(e) ?? mensagemDeErro(e)),
    onSettled: recarregar,
  });

  const avisos = s.avisos
    .map((a) => textoDoAvisoSistema({ avisos: [a] }))
    .filter((a): a is NonNullable<typeof a> => a !== null);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section aria-label="Tela principal" className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-2xl border border-hub-borda bg-white">
          <CapaDoSistema url={capa} nome={s.nome} endereco={s.url_producao} altura={280} />
          <div className="flex flex-wrap items-center gap-2 p-3">
            <input
              ref={arquivo}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) enviar.mutate(f);
              }}
            />
            <button
              type="button"
              className={classeBotaoSecundario}
              disabled={enviar.isPending}
              onClick={() => arquivo.current?.click()}
            >
              <ImagePlus className="size-4" aria-hidden="true" />
              {enviar.isPending
                ? "Enviando…"
                : s.capa_path
                  ? "Trocar o print"
                  : "Enviar print da tela"}
            </button>
            {s.capa_path && (
              <button
                type="button"
                className={cn(classeAcaoTexto, "gap-1.5")}
                disabled={tirar.isPending}
                onClick={() => tirar.mutate()}
              >
                <Trash2 className="size-4" aria-hidden="true" /> Tirar
              </button>
            )}
          </div>
        </div>
        {avisos.length > 0 && (
          <ul className="flex flex-col gap-2">
            {avisos.map((a) => (
              <li
                key={a.texto}
                className={cn(
                  "flex items-start gap-2 rounded-xl px-3 py-2.5 text-[14px]",
                  a.tom === "risco"
                    ? "bg-sit-risco text-sit-risco-t"
                    : "bg-sit-atencao text-sit-atencao-t",
                )}
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {a.texto}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="dados-t"
        className="rounded-2xl border border-hub-borda bg-white px-5 py-2"
      >
        <h2 id="dados-t" className="sr-only">
          Dados do sistema
        </h2>
        <dl>
          <Linha rotulo="Cliente">
            <Link
              to="/app/clientes/$id"
              params={{ id: s.client_id }}
              className="inline-flex min-h-11 items-center underline underline-offset-4 md:min-h-0"
            >
              {s.empresa}
            </Link>
          </Linha>
          <Linha rotulo="Projeto">
            {s.projeto ? (
              <Link
                to="/app/projetos/$id"
                params={{ id: s.projeto.id }}
                className="inline-flex min-h-11 items-center underline underline-offset-4 md:min-h-0"
              >
                {s.projeto.nome}
                {s.projeto.fase_nome && s.projeto.status === "andamento"
                  ? ` · fase ${s.projeto.fase_posicao} de ${s.projeto.fases_total}, ${s.projeto.fase_nome}`
                  : ""}
              </Link>
            ) : (
              <span className="text-hub-suave">Sem projeto ligado</span>
            )}
          </Linha>
          <Linha rotulo="Produção">
            <Endereco url={s.url_producao} />
          </Linha>
          <Linha rotulo="Teste">
            <Endereco url={s.url_teste} />
          </Linha>
          <Linha rotulo="No ar desde">
            {s.no_ar_desde ? (
              diaMes(`${s.no_ar_desde}T12:00:00`)
            ) : (
              <span className="text-hub-suave">—</span>
            )}
          </Linha>
          <Linha rotulo="Mensalidade do cliente">
            {s.mensalidade_cents > 0 ? (
              <span className="tabular-nums">{moeda(s.mensalidade_cents)}</span>
            ) : (
              <span className="text-hub-suave">Sem mensalidade ativa</span>
            )}
          </Linha>
          <Linha rotulo="Pedidos de ajuste">
            <Link
              to="/app/pedidos"
              search={{ cliente: s.client_id }}
              className="inline-flex min-h-11 items-center underline underline-offset-4 md:min-h-0"
            >
              {s.pedidos_abertos === 0
                ? "Nenhum aberto"
                : `${s.pedidos_abertos} ${s.pedidos_abertos === 1 ? "aberto" : "abertos"}`}
            </Link>
          </Linha>
          <Linha rotulo="Para que serve">
            {s.descricao ?? <span className="text-hub-suave">Sem descrição</span>}
          </Linha>
        </dl>
      </section>
    </div>
  );
}
