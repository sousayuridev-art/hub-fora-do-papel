import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Info } from "lucide-react";

import { SecaoDiagnostico } from "@/components/precos/SecaoDiagnostico";
import { SecaoMensalidade } from "@/components/precos/SecaoMensalidade";
import { SecaoPagamento } from "@/components/precos/SecaoPagamento";
import { SecaoValidade } from "@/components/precos/SecaoValidade";
import { SecaoValorHora } from "@/components/precos/SecaoValorHora";
import { classeAcaoPrincipal, classeBotaoSecundario } from "@/lib/estilos";
import { erro, mensagemDeErro, ok } from "@/lib/notify";
import {
  chavesPrecos,
  salvarPrecos,
  type DadosPrecos,
  type PlanoPreco,
  type Precos,
} from "@/lib/precos";
import { mensagemDaProposta } from "@/lib/propostas";

/** Configurações › Preços: rascunho local, salvar só com mudança, otimista com volta no erro. */
export function PrecosFormulario({ dados }: { dados: DadosPrecos }) {
  const qc = useQueryClient();
  const [p, setP] = useState<Precos>(dados.precos);
  const [planos, setPlanos] = useState<PlanoPreco[]>(dados.planos);

  // Recarregar (trocar de janela) não apaga o que a pessoa está editando
  const [base, setBase] = useState(dados);
  useEffect(() => {
    const editando =
      JSON.stringify(p) !== JSON.stringify(base.precos) ||
      JSON.stringify(planos) !== JSON.stringify(base.planos);
    if (!editando) {
      setP(dados.precos);
      setPlanos(dados.planos);
    }
    setBase(dados);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados]);

  const mudou = useMemo(
    () =>
      JSON.stringify(p) !== JSON.stringify(dados.precos) ||
      JSON.stringify(planos) !== JSON.stringify(dados.planos),
    [p, planos, dados],
  );

  const salvar = useMutation({
    mutationFn: () => salvarPrecos(p, planos),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: chavesPrecos.tudo });
      const antes = qc.getQueryData<DadosPrecos>(chavesPrecos.tudo);
      qc.setQueryData<DadosPrecos>(chavesPrecos.tudo, { precos: p, planos });
      return { antes };
    },
    onSuccess: (novo) => {
      qc.setQueryData(chavesPrecos.tudo, novo);
      ok("Preços salvos. Valem para o que for criado a partir de agora.");
    },
    onError: (e, _v, ctx) => {
      if (ctx?.antes) qc.setQueryData(chavesPrecos.tudo, ctx.antes);
      erro(mensagemDaProposta(e) ?? mensagemDeErro(e), { tentarDeNovo: () => salvar.mutate() });
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["propostas"] }),
  });

  const mudar = <K extends keyof Precos>(campo: K, valor: Precos[K]) =>
    setP((atual) => ({ ...atual, [campo]: valor }));
  const mudarPlano = (id: string, campos: Partial<PlanoPreco>) =>
    setPlanos((atual) => atual.map((pl) => (pl.id === id ? { ...pl, ...campos } : pl)));
  const pisoErrado = p.floor_cents > p.hour_cents;
  const conferido = Boolean(dados.precos.confirmed_at);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if ((mudou || !conferido) && !pisoErrado) salvar.mutate();
      }}
    >
      <div className="flex gap-3 rounded-2xl bg-sit-info p-4 text-sit-info-t">
        <Info className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p className="text-[14.5px]">
          <strong className="font-semibold">Propostas e cobranças leem estes valores.</strong> Uma
          mudança vale para o que for criado depois de salvar. O que já foi enviado ao cliente
          mantém o valor combinado.
        </p>
      </div>

      <SecaoValorHora p={p} mudar={mudar} />
      <SecaoDiagnostico p={p} mudar={mudar} />
      <SecaoMensalidade p={p} planos={planos} mudar={mudar} mudarPlano={mudarPlano} />
      <SecaoPagamento p={p} mudar={mudar} />
      <SecaoValidade p={p} mudar={mudar} />

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t border-hub-borda bg-hub-fundo/95 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-end sm:rounded-2xl sm:border">
        <p className="text-[14px] text-hub-suave sm:mr-auto" role="status">
          {pisoErrado
            ? "O piso não pode ser maior que a hora de referência."
            : mudou
              ? "Há alterações sem salvar."
              : !conferido
                ? "Preços ainda não conferidos: confira e salve para liberar o envio de propostas."
                : `Conferidos em ${new Date(dados.precos.confirmed_at ?? "").toLocaleDateString("pt-BR")}.`}
        </p>
        <button
          type="button"
          className={classeBotaoSecundario}
          disabled={!mudou || salvar.isPending}
          onClick={() => {
            setP(dados.precos);
            setPlanos(dados.planos);
          }}
        >
          Descartar
        </button>
        <button
          type="submit"
          className={`${classeAcaoPrincipal} disabled:opacity-50`}
          disabled={(!mudou && conferido) || pisoErrado || salvar.isPending}
        >
          <Check className="size-4" aria-hidden="true" />
          {conferido || mudou ? "Salvar alterações" : "Conferi, salvar"}
        </button>
      </div>
    </form>
  );
}
