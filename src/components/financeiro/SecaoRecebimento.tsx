import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CampoTexto } from "@/components/hub/Campo";
import { CampoNumero } from "@/components/hub/CampoNumero";
import { classeBotaoSecundario } from "@/lib/estilos";
import {
  chavesFinanceiro,
  lerRecebimento,
  mensagemDoFinanceiro,
  salvarRecebimento,
} from "@/lib/financeiro";
import { erro, mensagemDeErro, ok } from "@/lib/notify";

/** Configurações › Recebimento: chave Pix que o portal mostra e dia de vencimento das mensalidades. */
export function SecaoRecebimento() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: chavesFinanceiro.config, queryFn: lerRecebimento });
  const [chave, setChave] = useState("");
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [dia, setDia] = useState<number | null>(10);
  useEffect(() => {
    if (!q.data) return;
    setChave(q.data.pix_chave ?? "");
    setNome(q.data.pix_nome ?? "");
    setCidade(q.data.pix_cidade ?? "");
    setDia(q.data.dia_vencimento);
  }, [q.data]);
  const salvar = useMutation({
    mutationFn: salvarRecebimento,
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: chavesFinanceiro.config });
      const antes = qc.getQueryData(chavesFinanceiro.config);
      qc.setQueryData(chavesFinanceiro.config, {
        pix_chave: v.chave || null,
        pix_nome: v.nome || null,
        pix_cidade: v.cidade || null,
        dia_vencimento: v.dia,
      });
      return { antes };
    },
    onSuccess: () => ok("Recebimento salvo. O portal já mostra o Pix."),
    onError: (e, v, ctx) => {
      if (ctx?.antes) qc.setQueryData(chavesFinanceiro.config, ctx.antes);
      erro(mensagemDoFinanceiro(e) ?? mensagemDeErro(e), { tentarDeNovo: () => salvar.mutate(v) });
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: chavesFinanceiro.config }),
  });
  const pixIncompleto = chave.trim() !== "" && (nome.trim().length < 2 || cidade.trim().length < 2);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-hub-borda bg-white p-5 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-titulo text-lg font-bold">Recebimento</h2>
        <p className="text-[15px] text-hub-suave">
          O portal gera o Pix copia e cola e o QR com o valor exato de cada cobrança a partir desta
          chave. Sem chave, o portal pede para o cliente combinar o pagamento com você.
        </p>
      </div>
      {q.isError ? (
        <p className="text-[14px] text-sit-risco-t">
          Não foi possível carregar.{" "}
          <button type="button" className="min-h-11 underline" onClick={() => void q.refetch()}>
            Tentar de novo
          </button>
        </p>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            salvar.mutate({
              chave: chave.trim(),
              nome: nome.trim(),
              cidade: cidade.trim(),
              dia: dia ?? 10,
            });
          }}
        >
          <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)]">
            <CampoTexto
              rotulo="Chave Pix"
              valor={chave}
              aoMudar={setChave}
              maxLength={77}
              autoComplete="off"
              placeholder="CNPJ, e-mail, celular ou chave aleatória"
            />
            <CampoTexto
              rotulo="Nome de quem recebe"
              valor={nome}
              aoMudar={setNome}
              maxLength={25}
              ajuda="Até 25 letras"
            />
            <CampoTexto rotulo="Cidade" valor={cidade} aoMudar={setCidade} maxLength={15} />
          </div>
          <div className="max-w-xs">
            <CampoNumero
              rotulo="Dia de vencimento das mensalidades"
              valor={dia}
              aoMudar={setDia}
              casas={0}
              ajuda="De 1 a 28. Vale para as novas."
            />
          </div>
          {pixIncompleto && (
            <p className="text-[14px] text-sit-risco-t">
              Com a chave, informe também o nome e a cidade.
            </p>
          )}
          <button
            type="submit"
            className={`${classeBotaoSecundario} self-start`}
            disabled={pixIncompleto || salvar.isPending || q.isPending}
          >
            Salvar recebimento
          </button>
        </form>
      )}
    </section>
  );
}
