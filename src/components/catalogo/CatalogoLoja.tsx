import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import { EnviarFotoBotao } from "@/components/catalogo/EnviarFotoBotao";
import { useMutacoesCatalogo } from "@/components/catalogo/useMutacoesCatalogo";
import { CampoTexto } from "@/components/hub/Campo";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { Switch } from "@/components/ui/switch";
import {
  chavesCatalogo,
  lerConfig,
  slotsFoto,
  urlDaFoto,
  type ConfigCatalogo,
} from "@/lib/catalogo";
import { classeAcaoPrincipal } from "@/lib/estilos";

/** "(79) 99999-0001" enquanto digita; o banco guarda só os números. */
function telefone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 13);
  const l = d.length > 11 ? d.slice(-11) : d;
  if (l.length <= 2) return l;
  if (l.length <= 7) return `(${l.slice(0, 2)}) ${l.slice(2)}`;
  return `(${l.slice(0, 2)}) ${l.slice(2, l.length - 4)}-${l.slice(-4)}`;
}

/**
 * Ajustes da loja (HUB-CG-03): WhatsApp, endereço, horário, Instagram, seção Promoções,
 * marcas parceiras e as fotos fixas do site (capa, fachada e 6 do Instagram).
 */
export function CatalogoLoja({ siteId }: { siteId: string }) {
  const q = useQuery({ queryKey: chavesCatalogo.config(siteId), queryFn: () => lerConfig(siteId) });
  const m = useMutacoesCatalogo(siteId);
  const [c, setC] = useState<ConfigCatalogo | null>(null);
  const [marca, setMarca] = useState("");
  useEffect(() => {
    if (q.data && !c) setC(q.data);
  }, [q.data, c]);

  if (q.isError)
    return (
      <EstadoErro
        titulo="Não foi possível carregar os ajustes da loja"
        aoTentarDeNovo={() => void q.refetch()}
      />
    );
  if (!c) return <div className="h-64 animate-pulse rounded-2xl bg-white" aria-busy="true" />;

  const mudar = (x: Partial<ConfigCatalogo>) => setC((a) => (a ? { ...a, ...x } : a));
  const zap = (c.whatsapp ?? "").replace(/\D/g, "");
  const zapOk = zap.length === 0 || (zap.length >= 10 && zap.length <= 13);
  const addMarca = () => {
    const t = marca.trim();
    if (t && !c.marcas.includes(t)) mudar({ marcas: [...c.marcas, t] });
    setMarca("");
  };
  // Foto salva na hora (o arquivo já subiu; deixar só no formulário perderia a referência)
  const trocarFoto = (slot: string, caminho: string) => {
    const novo = { ...c, fotos: { ...c.fotos, [slot]: caminho } };
    setC(novo);
    m.config.mutate({ ...(q.data ?? novo), fotos: novo.fotos });
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <section
        aria-label="Contato da loja"
        className="flex flex-col gap-4 rounded-2xl border border-[#E3E7ED] bg-white p-5"
      >
        <h2 className="text-[15.5px] font-semibold">Contato da loja</h2>
        <div className="flex flex-col gap-1">
          <label htmlFor="cg-zap" className="text-[14px] font-medium">
            WhatsApp da loja (recebe os pedidos)
          </label>
          <input
            id="cg-zap"
            inputMode="tel"
            autoComplete="tel"
            value={telefone(c.whatsapp ?? "")}
            onChange={(e) => mudar({ whatsapp: e.target.value.replace(/\D/g, "") || null })}
            placeholder="(79) 99999-0000"
            className="h-11 rounded-xl border border-[#D9DEE5] px-3 text-base outline-none focus:border-hub-tinta"
          />
          {!zapOk && (
            <p role="alert" className="text-[13px] text-sit-risco-t">
              Use o número com DDD (10 ou 11 dígitos).
            </p>
          )}
        </div>
        <CampoTexto
          rotulo="Endereço"
          valor={c.endereco ?? ""}
          aoMudar={(v) => mudar({ endereco: v || null })}
          maxLength={200}
        />
        <CampoTexto
          rotulo="Horário"
          valor={c.horario ?? ""}
          aoMudar={(v) => mudar({ horario: v || null })}
          maxLength={200}
          placeholder="Seg a sex 9h às 18h · Sáb 9h às 13h"
        />
        <CampoTexto
          rotulo="Instagram"
          valor={c.instagram ?? ""}
          aoMudar={(v) => mudar({ instagram: v.replace(/^@/, "") || null })}
          maxLength={30}
          placeholder="@loja"
        />
        <label className="flex min-h-11 items-center justify-between gap-3 text-[14px]">
          <span>
            <b className="font-medium">Seção Promoções no site</b>
            <span className="block text-[13px] text-hub-suave">
              Desligada, a seção não aparece mesmo com produtos em promoção.
            </span>
          </span>
          <Switch
            checked={c.mostrar_promocoes}
            onCheckedChange={(v) => mudar({ mostrar_promocoes: v })}
          />
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-medium">Marcas parceiras</legend>
          <div className="flex flex-wrap gap-2">
            {c.marcas.map((x) => (
              <button
                key={x}
                type="button"
                aria-label={`Tirar a marca ${x}`}
                onClick={() => mudar({ marcas: c.marcas.filter((y) => y !== x) })}
                className="inline-flex min-h-11 items-center gap-1 rounded-full bg-[#F1F4F8] px-3 text-[14px] md:min-h-9"
              >
                {x} <X className="size-3.5" aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={marca}
              maxLength={60}
              aria-label="Nova marca"
              placeholder="Nome da marca"
              onChange={(e) => setMarca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addMarca();
                }
              }}
              className="h-11 min-w-0 flex-1 rounded-xl border border-[#D9DEE5] px-3 text-base outline-none focus:border-hub-tinta sm:max-w-xs"
            />
            <button
              type="button"
              onClick={addMarca}
              className="min-h-11 rounded-xl border border-[#D9DEE5] px-4 text-[14px] font-medium"
            >
              Incluir
            </button>
          </div>
        </fieldset>
        <button
          type="button"
          className={`${classeAcaoPrincipal} self-start`}
          disabled={!zapOk || m.config.isPending}
          onClick={() => m.config.mutate(c)}
        >
          {m.config.isPending ? "Salvando…" : "Salvar ajustes"}
        </button>
      </section>

      <section
        aria-label="Fotos do site"
        className="flex flex-col gap-4 rounded-2xl border border-[#E3E7ED] bg-white p-5"
      >
        <h2 className="text-[15.5px] font-semibold">Fotos do site</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {slotsFoto.map((s) => {
            const url = urlDaFoto(c.fotos[s.id]);
            return (
              <div key={s.id} className="flex flex-col gap-2">
                <span className="text-[13px] font-medium">{s.rotulo}</span>
                {url ? (
                  <img
                    src={url}
                    alt=""
                    className="aspect-[4/3] w-full rounded-lg bg-[#F5F7FA] object-cover"
                  />
                ) : (
                  <span className="grid aspect-[4/3] w-full place-items-center rounded-lg bg-[#F5F7FA] text-[12.5px] text-hub-suave">
                    sem foto
                  </span>
                )}
                <EnviarFotoBotao
                  siteId={siteId}
                  maiorLado={s.maiorLado}
                  rotulo={url ? "Trocar foto" : "Enviar foto"}
                  aoEnviar={(caminho) => trocarFoto(s.id, caminho)}
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
