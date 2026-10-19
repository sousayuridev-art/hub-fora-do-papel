import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { ArquivoCartao } from "@/components/portal/ArquivoCartao";
import { EnviarArquivos } from "@/components/portal/EnviarArquivos";
import { TituloPortal } from "@/components/portal/TituloPortal";
import { dataLocal, diaMes } from "@/lib/formatar";
import {
  arquivosDoPortal,
  chavesMateriais,
  enviarDoPortal,
  mensagemDoMaterial,
} from "@/lib/materiais";
import { erro, mensagemDeErro, ok } from "@/lib/notify";
import { chavesPortal } from "@/lib/portal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/portal/arquivos")({
  head: () => ({ meta: [{ title: "Arquivos · Portal Fora do Papel" }] }),
  component: Arquivos,
});

type Envio = { arquivos: File[]; pendenciaId: string | null; titulo: string };

function Arquivos() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: chavesMateriais.portal, queryFn: arquivosDoPortal });
  const [aba, setAba] = useState<"agencia" | "enviados">("agencia");
  const [enviandoPara, setEnviandoPara] = useState<string | null>(null);

  // Um arquivo por vez: reserva, envia ao armazenamento e confirma. A pendência fecha no banco.
  const enviar = useMutation({
    mutationFn: async (v: Envio) => {
      for (const arquivo of v.arquivos)
        await enviarDoPortal({
          arquivo,
          pendenciaId: v.pendenciaId,
          titulo: v.arquivos.length === 1 ? v.titulo : "",
        });
    },
    onMutate: (v) => setEnviandoPara(v.pendenciaId ?? "avulso"),
    onSuccess: (_r, v) => {
      ok(
        v.arquivos.length === 1
          ? "Arquivo enviado. Obrigado!"
          : `${v.arquivos.length} arquivos enviados. Obrigado!`,
      );
      setAba("enviados");
    },
    onError: (e, v) =>
      erro(mensagemDoMaterial(e) ?? mensagemDeErro(e), { tentarDeNovo: () => enviar.mutate(v) }),
    onSettled: () => {
      setEnviandoPara(null);
      void qc.invalidateQueries({ queryKey: chavesPortal.tudo });
    },
  });

  if (q.isError)
    return (
      <EstadoErro
        titulo="Não foi possível carregar os arquivos"
        aoTentarDeNovo={() => void q.refetch()}
      />
    );
  if (!q.data)
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <div className="h-16 w-72 animate-pulse rounded-xl bg-white" />
        <div className="h-48 animate-pulse rounded-3xl bg-white" />
      </div>
    );

  const d = q.data;
  const lista = aba === "agencia" ? d.da_agencia : d.enviados;
  return (
    <div className="flex flex-col gap-8">
      <TituloPortal
        rotulo="Arquivos"
        titulo="Seus arquivos"
        texto="Mande fotos, logo e textos por aqui, e encontre o que preparamos para você."
        acao={
          <EnviarArquivos
            rotulo="Enviar arquivo"
            enviando={enviandoPara === "avulso"}
            aoEscolher={(arquivos) => enviar.mutate({ arquivos, pendenciaId: null, titulo: "" })}
          />
        }
      />

      {d.falta_enviar.length > 0 && (
        <section aria-labelledby="falta" className="flex flex-col gap-3">
          <h2 id="falta" className="font-titulo text-xl font-bold">
            O que falta enviar
          </h2>
          <ul className="flex flex-col gap-3">
            {d.falta_enviar.map((p, i) => (
              <li
                key={p.id}
                className="flex flex-col gap-3 rounded-2xl border border-[#F2D9A6] bg-[#FFF8EA] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-semibold">{p.titulo}</span>
                  {p.detalhe && <span className="text-[14px] text-hub-suave">{p.detalhe}</span>}
                  {p.prazo && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[13.5px]",
                        p.atrasada ? "font-medium text-sit-risco-t" : "text-hub-suave",
                      )}
                    >
                      {p.atrasada && <CircleAlert className="size-3.5" aria-hidden="true" />}
                      {p.atrasada ? "Atrasado desde" : "Até"} {diaMes(dataLocal(p.prazo))}
                    </span>
                  )}
                </div>
                <EnviarArquivos
                  rotulo="Escolher arquivos"
                  principal={i === 0}
                  enviando={enviandoPara === p.id}
                  aoEscolher={(arquivos) =>
                    enviar.mutate({ arquivos, pendenciaId: p.id, titulo: p.titulo })
                  }
                />
              </li>
            ))}
          </ul>
          <p className="text-[13.5px] text-hub-suave">
            Até 25 MB por arquivo: PDF, foto, Word, Excel, PowerPoint, zip, vídeo MP4 ou áudio MP3.
          </p>
        </section>
      )}

      <section aria-label="Arquivos" className="flex flex-col gap-4">
        <div
          role="tablist"
          aria-label="Arquivos"
          className="grid w-full grid-cols-2 gap-1 rounded-xl bg-coluna p-1 sm:inline-grid sm:w-auto sm:self-start"
        >
          {(
            [
              ["agencia", "Da Fora do Papel", d.da_agencia.length],
              ["enviados", "Enviados por você", d.enviados.length],
            ] as const
          ).map(([id, rotulo, n]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={aba === id}
              onClick={() => setAba(id)}
              className={cn(
                "flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-[14px] sm:text-[14.5px]",
                aba === id ? "bg-white font-semibold shadow-sm" : "text-hub-suave",
              )}
            >
              {rotulo}
              <span className="rounded-md bg-[#E1E1DA] px-1.5 text-[12.5px] tabular-nums">{n}</span>
            </button>
          ))}
        </div>
        {lista.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
            {aba === "agencia"
              ? "Quando prepararmos algo para você (guias, contrato, entregas), aparece aqui."
              : 'Você ainda não enviou arquivos. Use "Enviar arquivo" quando quiser.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {lista.map((m) => (
              <ArquivoCartao key={m.id} m={m} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
