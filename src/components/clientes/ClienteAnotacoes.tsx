import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { mensagemAmigavel } from "@/components/funil/useMutacoesFunil";
import { classeBotaoSecundario } from "@/lib/estilos";
import { diaMes } from "@/lib/formatar";
import { anotar, chavesClientes, type ItemLinhaDoTempo } from "@/lib/funil";
import { erro, ok } from "@/lib/notify";

/** Anotações internas ("Só você vê"): as 3 mais recentes e o campo de nova anotação. */
export function ClienteAnotacoes({
  clienteId,
  linha,
}: {
  clienteId: string;
  linha: ItemLinhaDoTempo[] | undefined;
}) {
  const [texto, setTexto] = useState("");
  const qc = useQueryClient();
  const notas = (linha ?? []).filter((i) => i.tipo === "anotacao").slice(0, 3);

  const salvar = useMutation({
    mutationFn: (t: string) => anotar(clienteId, t),
    onMutate: async (t) => {
      await qc.cancelQueries({ queryKey: chavesClientes.linha(clienteId) });
      const antes = qc.getQueryData<ItemLinhaDoTempo[]>(chavesClientes.linha(clienteId));
      qc.setQueryData<ItemLinhaDoTempo[]>(chavesClientes.linha(clienteId), [
        {
          tipo: "anotacao",
          quando: new Date().toISOString(),
          kind: null,
          de: null,
          para: null,
          detalhe: {},
          texto: t,
          origem: "hub",
        },
        ...(antes ?? []),
      ]);
      setTexto("");
      return { antes };
    },
    onSuccess: () => ok("Anotação salva."),
    onError: (e, t, ctx) => {
      qc.setQueryData(chavesClientes.linha(clienteId), ctx?.antes);
      setTexto(t);
      erro(mensagemAmigavel(e), { tentarDeNovo: () => salvar.mutate(t) });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: chavesClientes.linha(clienteId) });
      void qc.invalidateQueries({ queryKey: chavesClientes.ficha(clienteId) });
    },
  });

  return (
    <section
      aria-labelledby="titulo-anotacoes"
      className="flex flex-col gap-3 rounded-2xl border border-[#F1E3BF] bg-[#FFFBF1] p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="titulo-anotacoes" className="font-titulo text-lg font-bold">
          Anotações
        </h2>
        <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[13px] text-hub-suave">
          <Lock className="size-3.5" aria-hidden="true" /> Só você vê
        </span>
      </div>
      {notas.map((n, i) => (
        <article
          key={`${n.quando}-${i}`}
          className="rounded-xl border border-[#F1E3BF] bg-white p-3.5"
        >
          <p className="whitespace-pre-line text-[14.5px]">{n.texto}</p>
          <p className="mt-1.5 font-rotulo text-[12.5px] text-hub-suave">{diaMes(n.quando)}</p>
        </article>
      ))}
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (texto.trim()) salvar.mutate(texto.trim());
        }}
      >
        <label htmlFor="nova-anotacao" className="text-[14px] font-medium">
          Nova anotação
        </label>
        <Textarea
          id="nova-anotacao"
          value={texto}
          maxLength={4000}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Algo que só a equipe deve saber sobre este cliente"
          className="min-h-24 bg-white text-base md:text-[15px]"
        />
        <button
          type="submit"
          className={`${classeBotaoSecundario} self-start`}
          disabled={!texto.trim() || salvar.isPending}
        >
          Salvar anotação
        </button>
      </form>
    </section>
  );
}
