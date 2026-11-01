import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

import { useMutacoesCatalogo } from "@/components/catalogo/useMutacoesCatalogo";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { chavesCatalogo, listarDepoimentos, type DepoimentoCatalogo } from "@/lib/catalogo";
import { classeBotaoSecundario } from "@/lib/estilos";

function Editor({
  inicial,
  aoSalvar,
  aoApagar,
  salvando,
}: {
  inicial: { texto: string; autor: string };
  aoSalvar: (v: { texto: string; autor: string }) => void;
  aoApagar?: () => void;
  salvando: boolean;
}) {
  const [texto, setTexto] = useState(inicial.texto);
  const [autor, setAutor] = useState(inicial.autor);
  const valido = texto.trim().length >= 3 && autor.trim().length >= 2;
  const mudou = texto !== inicial.texto || autor !== inicial.autor;
  return (
    <div className="flex flex-col gap-2 border-t border-[#EEF1F5] p-4 first:border-t-0">
      <textarea
        value={texto}
        maxLength={600}
        rows={3}
        aria-label="Texto do depoimento"
        placeholder="O que o cliente disse"
        onChange={(e) => setTexto(e.target.value)}
        className="w-full rounded-xl border border-[#D9DEE5] px-3 py-2 text-base outline-none focus:border-hub-tinta md:text-[15px]"
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={autor}
          maxLength={80}
          aria-label="Quem disse"
          placeholder="Quem disse (nome autorizado)"
          onChange={(e) => setAutor(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-xl border border-[#D9DEE5] px-3 text-base outline-none focus:border-hub-tinta md:text-[15px]"
        />
        <div className="flex gap-2">
          {aoApagar && (
            <button
              type="button"
              onClick={aoApagar}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-[14px] font-medium text-sit-risco-t hover:bg-sit-risco"
            >
              <Trash2 className="size-4" aria-hidden="true" /> Apagar
            </button>
          )}
          <button
            type="button"
            className={classeBotaoSecundario}
            disabled={!valido || !mudou || salvando}
            onClick={() => {
              aoSalvar({ texto: texto.trim(), autor: autor.trim() });
              if (!aoApagar) {
                setTexto("");
                setAutor("");
              }
            }}
          >
            {aoApagar ? "Salvar" : "Incluir"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Depoimentos do catálogo (HUB-CG-03), com o aviso de autorização por escrito. */
export function CatalogoDepoimentos({ siteId }: { siteId: string }) {
  const q = useQuery({
    queryKey: chavesCatalogo.depoimentos(siteId),
    queryFn: () => listarDepoimentos(siteId),
  });
  const m = useMutacoesCatalogo(siteId);
  if (q.isError)
    return (
      <EstadoErro
        titulo="Não foi possível carregar os depoimentos"
        aoTentarDeNovo={() => void q.refetch()}
      />
    );
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <p className="rounded-xl bg-sit-atencao p-3 text-[14px] text-sit-atencao-t">
        Publique só depoimento real, com autorização por escrito de quem disse.
      </p>
      <div className="overflow-hidden rounded-2xl border border-[#E3E7ED] bg-white">
        {(q.data ?? []).map((d: DepoimentoCatalogo) => (
          <Editor
            key={`${d.id}-${d.texto}-${d.autor}`}
            inicial={d}
            salvando={m.depoimento.isPending}
            aoSalvar={(v) => m.depoimento.mutate({ id: d.id, ...v })}
            aoApagar={() => m.apagarDep.mutate(d)}
          />
        ))}
        <Editor
          inicial={{ texto: "", autor: "" }}
          salvando={m.depoimento.isPending}
          aoSalvar={(v) => m.depoimento.mutate(v)}
        />
      </div>
    </div>
  );
}
