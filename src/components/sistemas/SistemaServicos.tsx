import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plus, Server, Trash2 } from "lucide-react";

import { CampoEscolha, CampoTexto } from "@/components/hub/Campo";
import { CampoDinheiro } from "@/components/hub/CampoDinheiro";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { Button } from "@/components/ui/button";
import { classeBotaoSecundario } from "@/lib/estilos";
import { diaMes, moeda } from "@/lib/formatar";
import { erro, mensagemDeErro, ok } from "@/lib/notify";
import {
  apagarServico,
  chavesSistemas,
  enderecoValido,
  mensagemDoSistema,
  normalizarEndereco,
  salvarServico,
  servicosDoSistema,
  type DadosServico,
  type ServicoSistema,
} from "@/lib/sistemas";
import { cn } from "@/lib/utils";

const vazio: DadosServico = {
  nome: "",
  para_que: null,
  custo_cents: null,
  quem_paga: "nos",
  vence_em: null,
  painel_url: null,
};

/**
 * Infraestrutura do sistema (SIS-1): o que o mantém no ar, quanto custa por mês e quem paga.
 * Nunca guarde senha ou chave aqui: só o nome do serviço e o endereço do painel.
 */
export function SistemaServicos({
  sistemaId,
  custoNosso,
  custoCliente,
}: {
  sistemaId: string;
  /** Totais do mês, somados no banco (sistemas_resumo). */
  custoNosso: number;
  custoCliente: number;
}) {
  const qc = useQueryClient();
  const chave = chavesSistemas.servicos(sistemaId);
  const q = useQuery({ queryKey: chave, queryFn: () => servicosDoSistema(sistemaId) });
  const [editando, setEditando] = useState<ServicoSistema | "novo" | null>(null);
  const [confirmar, setConfirmar] = useState<string | null>(null);

  const recarregar = () => {
    void qc.invalidateQueries({ queryKey: chave });
    void qc.invalidateQueries({ queryKey: chavesSistemas.resumo });
  };
  const apagar = useMutation({
    mutationFn: apagarServico,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: chave });
      const antes = qc.getQueryData<ServicoSistema[]>(chave);
      qc.setQueryData<ServicoSistema[]>(chave, (l) => (l ?? []).filter((s) => s.id !== id));
      return { antes };
    },
    onSuccess: () => ok("Serviço apagado."),
    onError: (e, id, ctx) => {
      if (ctx?.antes) qc.setQueryData(chave, ctx.antes);
      erro(mensagemDoSistema(e) ?? mensagemDeErro(e), { tentarDeNovo: () => apagar.mutate(id) });
    },
    onSettled: () => {
      setConfirmar(null);
      recarregar();
    },
  });

  const lista = q.data ?? [];

  return (
    <section aria-labelledby="infra-t" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="infra-t" className="font-titulo text-lg font-bold">
            Infraestrutura
          </h2>
          <p className="text-[14px] text-hub-suave">
            O que mantém o sistema no ar. Senhas e chaves não ficam aqui.
          </p>
        </div>
        <button type="button" className={classeBotaoSecundario} onClick={() => setEditando("novo")}>
          <Plus className="size-4" aria-hidden="true" /> Incluir serviço
        </button>
      </div>

      {q.isError ? (
        <EstadoErro
          titulo="Não foi possível carregar os serviços"
          aoTentarDeNovo={() => void q.refetch()}
        />
      ) : q.isPending ? (
        <div className="h-24 animate-pulse rounded-2xl bg-white" aria-busy="true" />
      ) : lista.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
          Nenhum serviço ainda. Inclua o banco, a hospedagem, o domínio e o que mais o sistema usa.
        </p>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-hub-borda overflow-hidden rounded-2xl border border-hub-borda bg-white">
            {lista.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sit-info text-sit-info-t max-sm:hidden">
                  <Server className="size-5" aria-hidden="true" />
                </span>
                <button
                  type="button"
                  onClick={() => setEditando(s)}
                  className="flex min-h-11 min-w-0 flex-1 flex-col items-start text-left"
                >
                  <span className="block w-full truncate font-medium">{s.nome}</span>
                  <span className="block w-full truncate text-[13px] text-hub-suave">
                    {[
                      s.para_que,
                      s.quem_paga === "cliente" ? "o cliente paga" : "nós pagamos",
                      s.vence_em ? `vence em ${diaMes(`${s.vence_em}T12:00:00`)}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </button>
                <span className="shrink-0 text-right text-[14.5px] font-semibold tabular-nums">
                  {s.custo_cents != null ? moeda(s.custo_cents) : "—"}
                  <span className="block text-[12.5px] font-normal text-hub-suave">por mês</span>
                </span>
                {s.painel_url && (
                  <a
                    href={s.painel_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`Abrir o painel de ${s.nome}`}
                    className="grid size-11 shrink-0 place-items-center rounded-lg hover:bg-hub-fundo"
                  >
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </a>
                )}
                {confirmar === s.id ? (
                  <button
                    type="button"
                    className="min-h-11 shrink-0 rounded-lg bg-[#9A1C12] px-3 text-[14px] font-semibold text-white"
                    onClick={() => apagar.mutate(s.id)}
                  >
                    Confirmar
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label={`Apagar ${s.nome}`}
                    className="grid size-11 shrink-0 place-items-center rounded-lg text-hub-suave hover:bg-hub-fundo"
                    onClick={() => setConfirmar(s.id)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-4">
              <dt className="text-[13px] text-hub-suave">Nós pagamos por mês</dt>
              <dd className="text-[22px] font-semibold tabular-nums">{moeda(custoNosso)}</dd>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <dt className="text-[13px] text-hub-suave">O cliente paga por mês</dt>
              <dd className="text-[22px] font-semibold tabular-nums">{moeda(custoCliente)}</dd>
            </div>
          </dl>
        </>
      )}

      <ServicoPainel
        sistemaId={sistemaId}
        servico={editando === "novo" ? null : editando}
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
        aoSalvar={recarregar}
      />
    </section>
  );
}

function ServicoPainel({
  sistemaId,
  servico,
  aberto,
  aoFechar,
  aoSalvar,
}: {
  sistemaId: string;
  servico: ServicoSistema | null;
  aberto: boolean;
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const [d, setD] = useState<DadosServico>(vazio);
  const [tentou, setTentou] = useState(false);
  useEffect(() => {
    if (!aberto) return;
    setTentou(false);
    setD(servico ? { ...servico } : vazio);
  }, [aberto, servico]);
  const mudar = (m: Partial<DadosServico>) => setD((x) => ({ ...x, ...m }));
  const painel = d.painel_url ? normalizarEndereco(d.painel_url) : "";
  const nomeOk = d.nome.trim().length >= 2;
  const painelOk = enderecoValido(painel);

  const salvar = useMutation({
    mutationFn: () => salvarServico(sistemaId, servico ? { ...d, id: servico.id } : d),
    onSuccess: () => {
      ok("Serviço salvo.");
      aoSalvar();
      aoFechar();
    },
    onError: (e) =>
      erro(mensagemDoSistema(e) ?? mensagemDeErro(e), { tentarDeNovo: () => salvar.mutate() }),
  });

  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={(v) => !v && aoFechar()}
      titulo={servico ? servico.nome : "Novo serviço"}
      descricao="Banco, hospedagem, domínio, e-mail, integrações…"
      rodape={
        <Button
          type="button"
          className="h-11 w-full bg-[#FFB020] text-hub-tinta hover:bg-[#F5A50F] sm:w-auto"
          disabled={salvar.isPending}
          onClick={() => {
            setTentou(true);
            if (nomeOk && painelOk && !salvar.isPending) salvar.mutate();
          }}
        >
          {salvar.isPending ? "Salvando…" : "Salvar serviço"}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <CampoTexto
            rotulo="Serviço"
            valor={d.nome}
            aoMudar={(v) => mudar({ nome: v })}
            maxLength={60}
            placeholder="Ex.: Supabase"
          />
          {tentou && !nomeOk && (
            <p role="alert" className="text-[13px] text-sit-risco-t">
              Dê um nome com pelo menos 2 letras.
            </p>
          )}
        </div>
        <CampoTexto
          rotulo="Para que serve"
          valor={d.para_que ?? ""}
          aoMudar={(v) => mudar({ para_que: v || null })}
          maxLength={140}
          placeholder="Ex.: banco de dados e login"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoDinheiro
            rotulo="Custo"
            valor={d.custo_cents}
            aoMudar={(v) => mudar({ custo_cents: v })}
            sufixo="/mês"
          />
          <CampoEscolha<"nos" | "cliente">
            rotulo="Quem paga"
            valor={d.quem_paga}
            aoMudar={(v) => mudar({ quem_paga: v })}
            opcoes={[
              { id: "nos", rotulo: "Nós" },
              { id: "cliente", rotulo: "O cliente" },
            ]}
          />
        </div>
        <CampoTexto
          rotulo="Vence em"
          tipo="date"
          valor={d.vence_em ?? ""}
          aoMudar={(v) => mudar({ vence_em: v || null })}
          ajuda="Domínio, certificado ou plano anual. Avisamos 30 dias antes."
        />
        <div className="flex flex-col gap-1">
          <CampoTexto
            rotulo="Endereço do painel"
            tipo="url"
            valor={d.painel_url ?? ""}
            aoMudar={(v) => mudar({ painel_url: v || null })}
            maxLength={300}
            placeholder="https://supabase.com/dashboard/project/…"
          />
          {tentou && !painelOk && (
            <p role="alert" className={cn("text-[13px] text-sit-risco-t")}>
              Confira o endereço.
            </p>
          )}
        </div>
      </div>
    </PainelLateral>
  );
}
