import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Check, CloudOff, Loader2, UserRound } from "lucide-react";

import { Selo } from "@/components/hub/Selo";
import { AcoesEnviada } from "@/components/propostas/AcoesEnviada";
import { AntesDeEnviar } from "@/components/propostas/AntesDeEnviar";
import { BlocoApresentacao } from "@/components/propostas/BlocoApresentacao";
import { BlocoFases } from "@/components/propostas/BlocoFases";
import { BlocoFora } from "@/components/propostas/BlocoFora";
import { BlocoItens } from "@/components/propostas/BlocoItens";
import { BlocoMensalidade } from "@/components/propostas/BlocoMensalidade";
import { BlocoOuvimos } from "@/components/propostas/BlocoOuvimos";
import { BlocoPagamento } from "@/components/propostas/BlocoPagamento";
import { BlocoValor } from "@/components/propostas/BlocoValor";
import { PainelValor } from "@/components/propostas/PainelValor";
import { RecusadaPainel } from "@/components/propostas/RecusadaPainel";
import { rascunhoDe, type Rascunho } from "@/components/propostas/tipos";
import { useEditorProposta, type EstadoSalvamento } from "@/components/propostas/useEditorProposta";
import { diaComHora } from "@/lib/formatar";
import { chavesClientes, chavesFunil } from "@/lib/funil";
import { erro, mensagemDeErro, ok } from "@/lib/notify";
import {
  chavesPropostas,
  enviarProposta,
  marcarRecusada,
  mensagemDaProposta,
  reabrirProposta,
  type DetalheProposta,
  type DocProposta,
} from "@/lib/propostas";

const rotuloSituacao = {
  rascunho: { texto: "Rascunho", tom: "neutro" },
  enviada: { texto: "Enviada", tom: "info" },
  aceita: { texto: "Aceita", tom: "ok" },
  recusada: { texto: "Recusada", tom: "risco" },
} as const;

function AvisoSalvamento({ estado }: { estado: EstadoSalvamento }) {
  const mapa = {
    salvo: { icone: Check, texto: "Salvo automaticamente" },
    pendente: { icone: Loader2, texto: "Salvando…" },
    salvando: { icone: Loader2, texto: "Salvando…" },
    erro: { icone: CloudOff, texto: "Não salvo" },
  } as const;
  const { icone: Icone, texto } = mapa[estado];
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 text-[13.5px] ${estado === "erro" ? "text-sit-risco-t" : "text-hub-suave"}`}
    >
      <Icone
        className={`size-4 ${estado === "salvando" ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      {texto}
    </span>
  );
}

/** Editor da proposta: blocos no centro, valor e envio à direita (abaixo no celular). */
export function PropostaEditor({ detalhe }: { detalhe: DetalheProposta }) {
  const qc = useQueryClient();
  const p = detalhe.proposta;
  const c = detalhe.calculo;
  const [d, setD] = useState<Rascunho>(() => rascunhoDe(p));
  const [recusar, setRecusar] = useState(false);
  const editor = useEditorProposta(detalhe);
  const bloqueado = p.status !== "rascunho";

  const alterar = (parcial: DocProposta) => {
    setD((atual) => ({ ...atual, ...parcial }) as Rascunho);
    editor.mudar(parcial);
  };

  const atualizarTudo = () => {
    void qc.invalidateQueries({ queryKey: chavesPropostas.tudo });
    void qc.invalidateQueries({ queryKey: chavesFunil.tudo });
    void qc.invalidateQueries({ queryKey: chavesClientes.tudo });
  };

  const comAntes = async () => {
    await qc.cancelQueries({ queryKey: chavesPropostas.detalhe(p.id) });
    return qc.getQueryData<DetalheProposta>(chavesPropostas.detalhe(p.id));
  };
  const mudarSituacao = (status: DetalheProposta["proposta"]["status"]) =>
    qc.setQueryData<DetalheProposta>(chavesPropostas.detalhe(p.id), (a) =>
      a ? { ...a, proposta: { ...a.proposta, status } } : a,
    );

  const enviar = useMutation({
    mutationFn: async () => {
      const r = await editor.salvarAgora();
      if (!r.ok) throw new Error("Não foi possível salvar antes de enviar.");
      return enviarProposta(p.id, r.versao);
    },
    onMutate: async () => {
      const antes = await comAntes();
      mudarSituacao("enviada");
      return { antes };
    },
    onSuccess: () => ok("Proposta enviada. Agora mande o link pelo WhatsApp."),
    onError: (e, _v, ctx) => {
      if (ctx?.antes) qc.setQueryData(chavesPropostas.detalhe(p.id), ctx.antes);
      erro(mensagemDaProposta(e) ?? mensagemDeErro(e), { tentarDeNovo: () => enviar.mutate() });
    },
    onSettled: atualizarTudo,
  });

  const reabrir = useMutation({
    mutationFn: () => reabrirProposta(p.id),
    onMutate: async () => {
      const antes = await comAntes();
      mudarSituacao("rascunho");
      return { antes };
    },
    onSuccess: () =>
      ok('Proposta reaberta como nova versão. O cliente vê "em atualização" até você reenviar.'),
    onError: (e, _v, ctx) => {
      if (ctx?.antes) qc.setQueryData(chavesPropostas.detalhe(p.id), ctx.antes);
      erro(mensagemDaProposta(e) ?? mensagemDeErro(e), { tentarDeNovo: () => reabrir.mutate() });
    },
    onSettled: atualizarTudo,
  });

  const recusada = useMutation({
    mutationFn: (motivo: string) => marcarRecusada(p.id, motivo),
    onMutate: async () => {
      const antes = await comAntes();
      mudarSituacao("recusada");
      return { antes };
    },
    onSuccess: () => ok("Proposta marcada como recusada."),
    onError: (e, motivo, ctx) => {
      if (ctx?.antes) qc.setQueryData(chavesPropostas.detalhe(p.id), ctx.antes);
      erro(mensagemDaProposta(e) ?? mensagemDeErro(e), {
        tentarDeNovo: () => recusada.mutate(motivo),
      });
    },
    onSettled: atualizarTudo,
  });

  const verComoCliente = () => window.open(`/previa/proposta/${p.id}`, "_blank", "noopener");
  const sit = rotuloSituacao[p.status];
  const primeiroNome = detalhe.cliente.contato.split(" ")[0] ?? detalhe.cliente.contato;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-4">
        <header className="flex flex-col gap-2 rounded-2xl border border-hub-borda bg-white p-5">
          <Link
            to="/app/propostas"
            search={{}}
            className="inline-flex min-h-11 items-center gap-1.5 self-start text-[14px] text-hub-suave hover:text-hub-tinta 2xl:hidden"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Todas as propostas
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-titulo text-[22px] font-bold leading-tight">
              <Link
                to="/app/clientes/$id"
                params={{ id: detalhe.cliente.id }}
                className="hover:underline"
              >
                {detalhe.cliente.empresa}
              </Link>
            </h2>
            <Selo tom={sit.tom}>{sit.texto}</Selo>
            {p.version > 1 && (
              <span className="text-[13px] text-hub-suave">versão {p.version}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-hub-suave">
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="size-4" aria-hidden="true" /> {detalhe.cliente.contato}
            </span>
            {detalhe.oportunidade.proximo_passo && detalhe.oportunidade.proximo_passo_em && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden="true" />
                {detalhe.oportunidade.proximo_passo} ·{" "}
                {diaComHora(detalhe.oportunidade.proximo_passo_em)}
              </span>
            )}
            {!bloqueado && <AvisoSalvamento estado={editor.estado} />}
          </div>
        </header>

        <BlocoApresentacao d={d} alterar={alterar} bloqueado={bloqueado} />
        <BlocoOuvimos d={d} alterar={alterar} bloqueado={bloqueado} />
        <BlocoItens d={d} alterar={alterar} bloqueado={bloqueado} horas={c.horas} />
        <BlocoValor d={d} alterar={alterar} bloqueado={bloqueado} c={c} />
        <BlocoFora d={d} alterar={alterar} bloqueado={bloqueado} />
        <BlocoMensalidade d={d} alterar={alterar} bloqueado={bloqueado} planos={detalhe.planos} />
        <BlocoFases d={d} alterar={alterar} bloqueado={bloqueado} />
        <BlocoPagamento c={c} validadeDias={detalhe.validade_dias} venceEm={p.expires_at} />
      </div>

      <aside
        className="flex flex-col gap-4 xl:sticky xl:top-6 xl:self-start"
        aria-label="Valor e envio"
      >
        <PainelValor c={c} />
        {p.status === "rascunho" ? (
          <AntesDeEnviar
            c={c}
            d={d}
            contato={primeiroNome}
            alterar={alterar}
            enviando={enviar.isPending}
            aoEnviar={() => enviar.mutate()}
            aoVerComoCliente={verComoCliente}
          />
        ) : (
          <AcoesEnviada
            detalhe={detalhe}
            ocupado={reabrir.isPending || recusada.isPending}
            aoReabrir={() => reabrir.mutate()}
            aoMarcarRecusada={() => setRecusar(true)}
            aoVerComoCliente={verComoCliente}
          />
        )}
      </aside>
      <RecusadaPainel
        aberto={recusar}
        aoFechar={() => setRecusar(false)}
        aoConfirmar={(m) => recusada.mutate(m)}
      />
    </div>
  );
}
