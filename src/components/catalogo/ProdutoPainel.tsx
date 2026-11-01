import { useEffect, useId, useState } from "react";
import { Star, Trash2, X } from "lucide-react";

import { EnviarFotoBotao } from "@/components/catalogo/EnviarFotoBotao";
import { CampoEscolha, CampoTexto } from "@/components/hub/Campo";
import { CampoDinheiro } from "@/components/hub/CampoDinheiro";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { Button } from "@/components/ui/button";
import {
  problemasDoProduto,
  rotuloSelo,
  urlDaFoto,
  type CategoriaCatalogo,
  type Cor,
  type DadosProduto,
  type ProdutoCatalogo,
  type Selo,
} from "@/lib/catalogo";
import { cn } from "@/lib/utils";

const vazio = (categoria: string): DadosProduto => ({
  nome: "",
  categoria,
  marca: null,
  preco_cents: null,
  tamanhos: [],
  cores: [],
  selo: null,
  promo_pct: null,
  fotos: [],
});

function Erro({ texto }: { texto: string | undefined }) {
  if (!texto) return null;
  return (
    <p role="alert" className="text-[13px] text-sit-risco-t">
      {texto}
    </p>
  );
}

/**
 * Produto do catálogo (HUB-CG-02): nome, marca, categoria, preço (centavos), tamanhos, cores,
 * selo e até 4 fotos (a 1ª é a principal). Excluir pede confirmação no próprio botão.
 */
export function ProdutoPainel({
  siteId,
  aberto,
  produto,
  categorias,
  marcas,
  salvando,
  aoFechar,
  aoSalvar,
  aoApagar,
}: {
  siteId: string;
  aberto: boolean;
  produto: ProdutoCatalogo | null;
  categorias: CategoriaCatalogo[];
  marcas: string[];
  salvando: boolean;
  aoFechar: () => void;
  aoSalvar: (p: DadosProduto) => void;
  aoApagar: (p: ProdutoCatalogo) => void;
}) {
  const [d, setD] = useState<DadosProduto>(() => vazio(categorias[0]?.id ?? ""));
  const [tamanho, setTamanho] = useState("");
  const [tentou, setTentou] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const listaMarcas = useId();

  useEffect(() => {
    if (!aberto) return;
    setD(produto ? { ...produto } : vazio(categorias[0]?.id ?? ""));
    setTentou(false);
    setConfirmar(false);
    setTamanho("");
    // reabre com os dados do produto escolhido
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, produto?.id]);

  const erros = problemasDoProduto(d);
  const mudar = (m: Partial<DadosProduto>) => setD((x) => ({ ...x, ...m }));
  const addTamanho = () => {
    const t = tamanho.trim().toUpperCase();
    if (t && !d.tamanhos.includes(t)) mudar({ tamanhos: [...d.tamanhos, t] });
    setTamanho("");
  };
  const salvar = () => {
    setTentou(true);
    if (Object.keys(erros).length > 0 || salvando) return;
    aoSalvar(produto ? { ...d, id: produto.id } : d);
  };

  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={(v) => !v && aoFechar()}
      titulo={produto ? `Produto ${produto.codigo}` : "Novo produto"}
      descricao="As mudanças vão ao site depois de publicar."
      largo
      rodape={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          {produto ? (
            confirmar ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 border-[#F6D3CF] text-sit-risco-t"
                onClick={() => aoApagar(produto)}
              >
                <Trash2 className="size-4" aria-hidden="true" /> Confirmar: apagar o produto
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="h-11 text-sit-risco-t"
                onClick={() => setConfirmar(true)}
              >
                <Trash2 className="size-4" aria-hidden="true" /> Apagar
              </Button>
            )
          ) : (
            <span />
          )}
          <Button
            type="button"
            className="h-11 bg-[#FFB020] text-hub-tinta hover:bg-[#F5A50F]"
            disabled={salvando}
            onClick={salvar}
          >
            {salvando ? "Salvando…" : "Salvar produto"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <CampoTexto
            rotulo="Nome"
            valor={d.nome}
            aoMudar={(v) => mudar({ nome: v })}
            maxLength={120}
          />
          {tentou && <Erro texto={erros.nome} />}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            rotulo="Marca"
            valor={d.marca ?? ""}
            aoMudar={(v) => mudar({ marca: v || null })}
            maxLength={60}
            list={listaMarcas}
          />
          <datalist id={listaMarcas}>
            {marcas.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <div className="flex flex-col gap-1">
            <CampoEscolha
              rotulo="Categoria"
              valor={d.categoria}
              aoMudar={(v) => mudar({ categoria: v })}
              opcoes={categorias.map((c) => ({ id: c.id, rotulo: c.nome }))}
              vazio="Escolha"
            />
            {tentou && <Erro texto={erros.categoria} />}
          </div>
        </div>
        <CampoDinheiro
          rotulo="Preço"
          valor={d.preco_cents}
          aoMudar={(v) => mudar({ preco_cents: v })}
          ajuda="Deixe vazio para mostrar “Consulte” no site."
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-medium">Tamanhos</legend>
          <div className="flex flex-wrap gap-2">
            {d.tamanhos.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => mudar({ tamanhos: d.tamanhos.filter((x) => x !== t) })}
                className="inline-flex min-h-11 items-center gap-1 rounded-full bg-[#F1F4F8] px-3 text-[14px] md:min-h-9"
                aria-label={`Tirar o tamanho ${t}`}
              >
                {t} <X className="size-3.5" aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={tamanho}
              onChange={(e) => setTamanho(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTamanho();
                }
              }}
              placeholder="Ex.: P, M, 42"
              aria-label="Novo tamanho"
              maxLength={8}
              autoCapitalize="characters"
              className="h-11 w-32 rounded-xl border border-[#D9DEE5] px-3 text-base outline-none focus:border-hub-tinta"
            />
            <Button type="button" variant="outline" className="h-11" onClick={addTamanho}>
              Incluir
            </Button>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-medium">Cores</legend>
          {d.cores.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="color"
                value={c.tom}
                aria-label={`Tom da cor ${c.nome || i + 1}`}
                onChange={(e) =>
                  mudar({
                    cores: d.cores.map((x, j) => (j === i ? { ...x, tom: e.target.value } : x)),
                  })
                }
                className="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-[#D9DEE5] bg-white p-1"
              />
              <input
                value={c.nome}
                aria-label="Nome da cor"
                placeholder="Ex.: Azul-marinho"
                maxLength={30}
                onChange={(e) =>
                  mudar({
                    cores: d.cores.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)),
                  })
                }
                className="h-11 min-w-0 flex-1 rounded-xl border border-[#D9DEE5] px-3 text-base outline-none focus:border-hub-tinta"
              />
              <button
                type="button"
                aria-label="Tirar a cor"
                onClick={() => mudar({ cores: d.cores.filter((_, j) => j !== i) })}
                className="grid size-11 shrink-0 place-items-center rounded-lg hover:bg-[#F1F4F8]"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="h-11 self-start"
            disabled={d.cores.length >= 20}
            onClick={() =>
              mudar({ cores: [...d.cores, { nome: "", tom: "#1C1D20" } satisfies Cor] })
            }
          >
            Incluir cor
          </Button>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-medium">Selo</legend>
          <div className="flex flex-wrap gap-2">
            {([null, "novo", "mais-vendido", "promo"] as (Selo | null)[]).map((s) => (
              <button
                key={s ?? "nenhum"}
                type="button"
                aria-pressed={d.selo === s}
                onClick={() => mudar({ selo: s, promo_pct: s === "promo" ? d.promo_pct : null })}
                className={cn(
                  "min-h-11 rounded-full border px-4 text-[14px] md:min-h-9",
                  d.selo === s
                    ? "border-hub-tinta bg-hub-tinta text-white"
                    : "border-[#D9DEE5] bg-white text-hub-tinta",
                )}
              >
                {s ? rotuloSelo[s] : "Nenhum"}
              </button>
            ))}
          </div>
          {d.selo === "promo" && (
            <label className="flex items-center gap-2 text-[14px]">
              Desconto
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={90}
                value={d.promo_pct ?? ""}
                onChange={(e) =>
                  mudar({ promo_pct: e.target.value ? Number(e.target.value) : null })
                }
                className="h-11 w-24 rounded-xl border border-[#D9DEE5] px-3 text-base outline-none focus:border-hub-tinta"
              />
              %
            </label>
          )}
          {tentou && <Erro texto={erros.promo_pct} />}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-medium">
            Fotos (até 4; a primeira é a principal)
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {d.fotos.map((f, i) => (
              <div
                key={f}
                className="relative overflow-hidden rounded-xl border border-[#E3E7ED] bg-[#F5F7FA]"
              >
                <img
                  src={urlDaFoto(f) ?? ""}
                  alt=""
                  className="aspect-square w-full object-cover"
                />
                {i === 0 ? (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-hub-tinta px-2 py-0.5 text-[12.5px] text-white">
                    Principal
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => mudar({ fotos: [f, ...d.fotos.filter((x) => x !== f)] })}
                    className="absolute left-1.5 top-1.5 inline-flex min-h-9 items-center gap-1 rounded-full bg-white/90 px-2 text-[12.5px]"
                  >
                    <Star className="size-3.5" aria-hidden="true" /> Principal
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Tirar a foto"
                  onClick={() => mudar({ fotos: d.fotos.filter((x) => x !== f) })}
                  className="absolute right-1.5 top-1.5 grid size-9 place-items-center rounded-full bg-white/90"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          {d.fotos.length < 4 && (
            <EnviarFotoBotao
              siteId={siteId}
              maiorLado={900}
              rotulo="Enviar foto"
              aoEnviar={(c) => setD((x) => ({ ...x, fotos: [...x.fotos, c].slice(0, 4) }))}
              className="self-start"
            />
          )}
        </fieldset>
      </div>
    </PainelLateral>
  );
}
