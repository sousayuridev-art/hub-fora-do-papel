import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { CampoTexto } from "@/components/hub/Campo";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { listarMateriais, rotuloCategoria, tipoLegivel, type Material } from "@/lib/materiais";
import {
  chavesMarketing,
  papelDoArquivo,
  rotuloPapel,
  type Formato,
  type PapelMidia,
} from "@/lib/marketing";

/**
 * Escolher um arquivo que já está em Materiais (MK-2). Mostra só arquivos prontos, fora da
 * lixeira, do tipo que o formato aceita. Foto enviada por cliente só aparece na peça dele.
 */
export function EscolherArquivoPainel({
  aberto,
  aoMudar,
  formato,
  clienteDaPeca,
  jaLigados,
  aoEscolher,
}: {
  aberto: boolean;
  aoMudar: (a: boolean) => void;
  formato: Formato;
  clienteDaPeca: string | null;
  jaLigados: string[];
  aoEscolher: (m: Material, papel: PapelMidia) => void;
}) {
  const [busca, setBusca] = useState("");
  const q = useQuery({
    queryKey: chavesMarketing.materiais,
    queryFn: listarMateriais,
    enabled: aberto,
    staleTime: 60_000,
  });

  const opcoes = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (q.data?.itens ?? [])
      .filter(
        (m) =>
          m.tipo === "arquivo" &&
          !m.excluido_em &&
          !jaLigados.includes(m.id) &&
          (m.origem !== "cliente" || (!!clienteDaPeca && m.client_id === clienteDaPeca)) &&
          !!m.mime &&
          papelDoArquivo(formato, m.mime) !== null &&
          (!termo || m.titulo.toLowerCase().includes(termo)),
      )
      .slice(0, 60);
  }, [q.data, busca, formato, clienteDaPeca, jaLigados]);

  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Escolher de Materiais"
      descricao="Só aparecem os arquivos que servem neste formato."
    >
      <div className="flex flex-col gap-4">
        <CampoTexto rotulo="Buscar pelo nome" valor={busca} aoMudar={setBusca} maxLength={80} />
        {q.isError ? (
          <EstadoErro
            titulo="Não conseguimos abrir Materiais"
            aoTentarDeNovo={() => void q.refetch()}
          />
        ) : !q.data ? (
          <p className="text-[14.5px] text-hub-suave">Carregando…</p>
        ) : opcoes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#D6D6CF] p-6 text-center text-[14.5px] text-hub-suave">
            Nenhum arquivo que sirva aqui. Use “Enviar do computador”.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {opcoes.map((m) => {
              const papel = papelDoArquivo(formato, m.mime ?? "") as PapelMidia;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      aoEscolher(m, papel);
                      aoMudar(false);
                    }}
                    className="flex min-h-14 w-full flex-col items-start gap-0.5 rounded-xl border border-hub-borda bg-white px-3 py-2 text-left hover:border-hub-tinta"
                  >
                    <b className="text-[14.5px] font-semibold">{m.titulo}</b>
                    <span className="text-[13px] text-hub-suave">
                      {tipoLegivel(m)} · {rotuloCategoria[m.categoria]} · entra como{" "}
                      {rotuloPapel[papel].toLowerCase()}
                      {m.origem === "cliente" ? " · enviado pelo cliente" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PainelLateral>
  );
}
