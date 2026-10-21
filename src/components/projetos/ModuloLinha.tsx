import { ExternalLink } from "lucide-react";

import { Selo, type Tom } from "@/components/hub/Selo";
import type { ModoModulo } from "@/components/projetos/ModuloPainel";
import { classeBotaoSecundario } from "@/lib/estilos";
import { diaMes } from "@/lib/formatar";
import { rotuloModulo, type Modulo, type SituacaoModulo } from "@/lib/projetos";

const tom: Record<SituacaoModulo, Tom> = {
  planejado: "neutro",
  desenvolvimento: "info",
  testes: "info",
  aguardando_aprovacao: "atencao",
  aprovado: "ok",
  publicado: "ok",
  fora_do_escopo: "neutro",
};

export type AcaoModulo =
  | { tipo: "mover"; situacao: SituacaoModulo }
  | { tipo: "painel"; modo: ModoModulo }
  | { tipo: "cancelar_aprovacao"; aprovacaoId: string };

type Botao = { rotulo: string; acao: AcaoModulo };

/** Próximo passo (principal) e ações secundárias de cada situação. */
function botoes(m: Modulo): { principal: Botao | null; outros: Botao[] } {
  const direta = m.caminho === "direta";
  const fora: Botao = {
    rotulo: "Fora do escopo",
    acao: { tipo: "mover", situacao: "fora_do_escopo" },
  };
  const editar: Botao = { rotulo: "Editar", acao: { tipo: "painel", modo: "editar" } };
  const publicar: Botao = { rotulo: "Publicar", acao: { tipo: "painel", modo: "publicar" } };
  switch (m.situacao) {
    case "planejado":
      return {
        principal: { rotulo: "Começar", acao: { tipo: "mover", situacao: "desenvolvimento" } },
        outros: [editar, fora],
      };
    case "desenvolvimento":
      return {
        principal: direta
          ? publicar
          : { rotulo: "Enviar para testes", acao: { tipo: "painel", modo: "testes" } },
        outros: m.no_ar_desde ? [editar] : [editar, fora],
      };
    case "testes":
      return {
        principal: direta
          ? publicar
          : { rotulo: "Pedir aprovação", acao: { tipo: "painel", modo: "aprovacao" } },
        outros: [
          {
            rotulo: "Voltar para desenvolvimento",
            acao: { tipo: "mover", situacao: "desenvolvimento" },
          },
          ...(m.no_ar_desde ? [] : [fora]),
        ],
      };
    case "aguardando_aprovacao":
      return {
        principal: null,
        outros: m.aprovacao
          ? [
              {
                rotulo: "Cancelar pedido",
                acao: { tipo: "cancelar_aprovacao", aprovacaoId: m.aprovacao.id },
              },
            ]
          : [],
      };
    case "aprovado":
      return {
        principal: publicar,
        outros: [
          {
            rotulo: "Voltar para desenvolvimento",
            acao: { tipo: "mover", situacao: "desenvolvimento" },
          },
        ],
      };
    case "publicado":
      return {
        principal: null,
        outros: [
          { rotulo: "Nova versão", acao: { tipo: "mover", situacao: "desenvolvimento" } },
          editar,
        ],
      };
    case "fora_do_escopo":
      return {
        principal: null,
        outros: [{ rotulo: "Voltar ao escopo", acao: { tipo: "mover", situacao: "planejado" } }],
      };
  }
}

function detalhe(m: Modulo): string {
  if (m.situacao === "aguardando_aprovacao" && m.aprovacao)
    return `Esperando o cliente desde ${diaMes(m.aprovacao.enviada_em)}`;
  if (m.situacao === "publicado" && m.ultima_versao)
    return `Última versão em ${diaMes(m.ultima_versao)}`;
  if (m.no_ar_desde) return `No ar desde ${diaMes(m.no_ar_desde)}; trabalhando na próxima versão`;
  return m.caminho === "direta" ? "Publicação direta" : "Com homologação";
}

/** Um módulo na seção Módulos do projeto (card SS-1). */
export function ModuloLinha({
  m,
  ocupado,
  aoAgir,
}: {
  m: Modulo;
  ocupado: boolean;
  aoAgir: (m: Modulo, a: AcaoModulo) => void;
}) {
  const { principal, outros } = botoes(m);
  const ajuste = m.situacao === "desenvolvimento" ? m.ultimo_ajuste : null;
  return (
    <li className="flex flex-col gap-3 border-b border-hub-borda py-4 last:border-b-0 md:flex-row md:items-start md:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <b className="text-[16px] font-semibold">{m.nome}</b>
          <Selo tom={tom[m.situacao]}>{rotuloModulo[m.situacao]}</Selo>
          {m.rodadas > 0 && (
            <span className="text-[13px] text-hub-suave">
              {m.rodadas === 1 ? "1 rodada de ajuste" : `${m.rodadas} rodadas de ajuste`}
            </span>
          )}
        </div>
        <span className="text-[14px] text-hub-suave">{detalhe(m)}</span>
        {ajuste?.comentario && (
          <p className="rounded-lg bg-sit-atencao px-3 py-2 text-[14px] text-sit-atencao-t">
            Ajuste pedido: “{ajuste.comentario}”
          </p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[14px]">
          {m.link_testes && m.situacao !== "publicado" && (
            <a
              href={m.link_testes}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-8 items-center gap-1 underline underline-offset-4"
            >
              Link de testes <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          )}
          {m.link_producao && m.no_ar_desde && (
            <a
              href={m.link_producao}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-8 items-center gap-1 underline underline-offset-4"
            >
              No ar <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {outros.map((b) => (
          <button
            key={b.rotulo}
            type="button"
            disabled={ocupado}
            onClick={() => aoAgir(m, b.acao)}
            className="inline-flex h-11 items-center justify-center px-2 text-[14.5px] font-medium text-hub-suave underline-offset-4 hover:text-hub-tinta hover:underline disabled:opacity-50"
          >
            {b.rotulo}
          </button>
        ))}
        {principal && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => aoAgir(m, principal.acao)}
            className={`${classeBotaoSecundario} max-md:order-first max-md:w-full`}
          >
            {principal.rotulo}
          </button>
        )}
      </div>
    </li>
  );
}
