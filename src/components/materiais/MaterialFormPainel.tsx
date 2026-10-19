import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Paperclip } from "lucide-react";

import { BotoesPainel } from "@/components/hub/BotoesPainel";
import { CampoArea, CampoEscolha, CampoTexto } from "@/components/hub/Campo";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { chavesClientes, listarClientes } from "@/lib/funil";
import {
  categoriasMaterial,
  problemaDoArquivo,
  tamanhoLegivel,
  tiposAceitos,
  type CategoriaMaterial,
  type Material,
  type TipoMaterial,
} from "@/lib/materiais";
import { chavesProjetos, projetosDoCliente } from "@/lib/projetos";
import { cn } from "@/lib/utils";

export type DadosMaterial = {
  id: string | null;
  tipo: TipoMaterial;
  categoria: CategoriaMaterial;
  titulo: string;
  descricao: string;
  conteudo: string;
  clienteId: string | null;
  projetoId: string | null;
  compartilhado: boolean;
  arquivos: File[];
};

const rotulosTipo: Record<TipoMaterial, string> = {
  arquivo: "Arquivo",
  texto: "Texto pronto",
  link: "Link",
};

/** Novo material (arquivo, texto pronto ou link) ou edição de um existente. */
export function MaterialFormPainel({
  aberto,
  aoMudar,
  material,
  inicial,
  aoSalvar,
}: {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  material: Material | null;
  inicial?: { clienteId?: string | undefined; categoria?: CategoriaMaterial | undefined };
  aoSalvar: (v: DadosMaterial) => void;
}) {
  const doCliente = material?.origem === "cliente";
  const [tipo, setTipo] = useState<TipoMaterial>("arquivo");
  const [categoria, setCategoria] = useState<CategoriaMaterial>("modelos");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [cliente, setCliente] = useState("");
  const [projeto, setProjeto] = useState("");
  const [compartilhado, setCompartilhado] = useState(false);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [problema, setProblema] = useState<string | null>(null);
  const seletor = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!aberto) return;
    setTipo(material?.tipo ?? "arquivo");
    setCategoria(
      material?.categoria ??
        (inicial?.categoria && inicial.categoria !== "cliente" ? inicial.categoria : "modelos"),
    );
    setTitulo(material?.titulo ?? "");
    setDescricao(material?.descricao ?? "");
    setConteudo(material?.texto ?? material?.url ?? "");
    setCliente(material?.client_id ?? inicial?.clienteId ?? "");
    setProjeto(material?.project_id ?? "");
    setCompartilhado(material?.compartilhado ?? false);
    setArquivos([]);
    setProblema(null);
  }, [aberto, material, inicial?.clienteId, inicial?.categoria]);

  const clientes = useQuery({
    queryKey: chavesClientes.lista,
    queryFn: listarClientes,
    enabled: aberto,
  });
  const projetos = useQuery({
    queryKey: chavesProjetos.doCliente(cliente),
    queryFn: () => projetosDoCliente(cliente),
    enabled: aberto && cliente !== "",
  });

  const varios = tipo === "arquivo" && !material && arquivos.length > 1;
  const valido =
    (varios || titulo.trim().length >= 2) &&
    (tipo !== "arquivo" || material !== null || arquivos.length > 0) &&
    (tipo !== "texto" || conteudo.trim().length >= 2) &&
    (tipo !== "link" || /^https:\/\/\S{3,}$/.test(conteudo.trim())) &&
    (!compartilhado || cliente !== "") &&
    problema === null;

  const escolher = (lista: FileList | null) => {
    const fs = Array.from(lista ?? []).slice(0, 20);
    const erroArq = fs.map(problemaDoArquivo).find(Boolean) ?? null;
    setProblema(erroArq);
    setArquivos(fs);
    const primeiro = fs[0];
    if (fs.length === 1 && primeiro && titulo.trim() === "")
      setTitulo(primeiro.name.replace(/\.[^.]+$/, "").slice(0, 120));
  };

  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo={material ? "Editar material" : "Enviar material"}
      descricao={
        material
          ? undefined
          : "Arquivos ficam guardados com acesso restrito. Compartilhado, o cliente vê no portal."
      }
      rodape={
        <BotoesPainel
          rotulo={
            material
              ? "Salvar"
              : tipo === "arquivo"
                ? arquivos.length > 1
                  ? `Enviar ${arquivos.length} arquivos`
                  : "Enviar"
                : "Salvar"
          }
          desabilitado={!valido}
          aoCancelar={() => aoMudar(false)}
          aoConfirmar={() => {
            aoSalvar({
              id: material?.id ?? null,
              tipo,
              categoria,
              titulo: titulo.trim(),
              descricao: descricao.trim(),
              conteudo: tipo === "link" ? conteudo.trim() : conteudo,
              clienteId: cliente || null,
              projetoId: projeto || null,
              compartilhado,
              arquivos,
            });
            aoMudar(false);
          }}
        />
      }
    >
      <div className="flex flex-col gap-4">
        {!material && (
          <div
            role="radiogroup"
            aria-label="Tipo"
            className="grid grid-cols-3 gap-1 rounded-xl bg-coluna p-1"
          >
            {(Object.keys(rotulosTipo) as TipoMaterial[]).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={tipo === t}
                onClick={() => {
                  setTipo(t);
                  setProblema(null);
                  if (t === "texto" && categoria === "modelos") setCategoria("textos");
                }}
                className={cn(
                  "min-h-11 rounded-lg text-[14.5px]",
                  tipo === t ? "bg-white font-semibold shadow-sm" : "text-hub-suave",
                )}
              >
                {rotulosTipo[t]}
              </button>
            ))}
          </div>
        )}

        {tipo === "arquivo" && !material && (
          <div className="flex flex-col gap-2">
            <input
              ref={seletor}
              type="file"
              multiple
              accept={tiposAceitos.join(",") + ",.heic,.heif"}
              className="sr-only"
              aria-label="Escolher arquivos"
              onChange={(e) => escolher(e.target.files)}
            />
            <button
              type="button"
              onClick={() => seletor.current?.click()}
              className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-[#D6D6CF] bg-hub-fundo px-4 py-4 text-center hover:border-hub-tinta"
            >
              <Paperclip className="size-5 text-hub-suave" aria-hidden="true" />
              <span className="font-medium">
                {arquivos.length === 0
                  ? "Escolher arquivos"
                  : arquivos.length === 1
                    ? arquivos[0]?.name
                    : `${arquivos.length} arquivos escolhidos`}
              </span>
              <span className="text-[13px] text-hub-suave">
                {arquivos.length > 0
                  ? tamanhoLegivel(arquivos.reduce((s, f) => s + f.size, 0))
                  : "PDF, imagem, Office, texto, zip, MP4 ou MP3 · até 25 MB cada"}
              </span>
            </button>
            {problema && <p className="text-[13.5px] text-sit-risco-t">{problema}</p>}
          </div>
        )}

        {!varios && <CampoTexto rotulo="Nome" valor={titulo} aoMudar={setTitulo} maxLength={120} />}
        {varios && (
          <p className="text-[13.5px] text-hub-suave">
            Cada arquivo entra com o próprio nome. Dá para renomear depois.
          </p>
        )}

        {tipo === "texto" && (
          <CampoArea
            rotulo="Texto"
            valor={conteudo}
            aoMudar={setConteudo}
            linhas={8}
            maxLength={20000}
          />
        )}
        {tipo === "link" && (
          <CampoTexto
            rotulo="Endereço"
            tipo="url"
            inputMode="url"
            placeholder="https://"
            valor={conteudo}
            aoMudar={setConteudo}
            ajuda="Precisa começar com https://"
          />
        )}

        {!doCliente && (
          <CampoEscolha
            rotulo="Categoria"
            valor={categoria}
            aoMudar={setCategoria}
            opcoes={categoriasMaterial.filter((c) => c.id !== "cliente")}
          />
        )}
        <CampoArea
          rotulo="Descrição (opcional)"
          valor={descricao}
          aoMudar={setDescricao}
          linhas={2}
          maxLength={600}
        />
        {!doCliente && (
          <CampoEscolha
            rotulo="Cliente (opcional)"
            valor={cliente}
            aoMudar={(v) => {
              setCliente(v);
              setProjeto("");
              if (v === "") setCompartilhado(false);
            }}
            opcoes={[
              { id: "", rotulo: "Nenhum: material da agência" },
              ...(clientes.data ?? [])
                .filter((c) => c.situacao !== "arquivado" || c.id === cliente)
                .map((c) => ({ id: c.id, rotulo: c.company_name })),
            ]}
          />
        )}
        {cliente !== "" && (projetos.data?.length ?? 0) > 0 && (
          <CampoEscolha
            rotulo="Projeto (opcional)"
            valor={projeto}
            aoMudar={setProjeto}
            opcoes={[
              { id: "", rotulo: "Nenhum" },
              ...(projetos.data ?? []).map((p) => ({ id: p.id, rotulo: p.name })),
            ]}
          />
        )}
        {!doCliente && (
          <label
            className={cn(
              "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-hub-borda p-3",
              cliente === "" && "cursor-not-allowed opacity-60",
            )}
          >
            <input
              type="checkbox"
              className="mt-0.5 size-5 accent-hub-tinta"
              checked={compartilhado}
              disabled={cliente === ""}
              onChange={(e) => setCompartilhado(e.target.checked)}
            />
            <span className="flex flex-col">
              <span className="font-medium">Compartilhar com o cliente</span>
              <span className="text-[13.5px] text-hub-suave">
                {cliente === ""
                  ? "Escolha o cliente para compartilhar."
                  : "Aparece no portal do cliente, em Arquivos."}
              </span>
            </span>
          </label>
        )}
      </div>
    </PainelLateral>
  );
}
