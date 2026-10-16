import { SugestoesCampanhas, idSugestoesCampanhas } from "@/components/trafego/SugestoesCampanhas";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { mensagemAmigavel } from "@/components/funil/useMutacoesFunil";
import {
  chavesClientes,
  chavesFunil,
  origens,
  salvarCliente,
  type CamposCliente,
  type ClienteLinha,
  type Origem,
} from "@/lib/funil";
import { erro, ok } from "@/lib/notify";

type Form = Required<
  Pick<
    CamposCliente,
    | "empresa"
    | "contato"
    | "papel"
    | "whatsapp"
    | "email"
    | "segmento"
    | "cidade"
    | "anuncio"
    | "indicado_por"
    | "site_atual"
  >
> & { origem: Origem };

const deCliente = (c: ClienteLinha): Form => ({
  empresa: c.company_name,
  contato: c.contact_name,
  papel: c.contact_role ?? "",
  whatsapp: c.whatsapp ?? "",
  email: c.email ?? "",
  segmento: c.segment ?? "",
  cidade: c.city ?? "",
  origem: c.origin,
  anuncio: c.ad_name ?? "",
  indicado_por: c.referred_by ?? "",
  site_atual: c.current_site ?? "",
});

const campos: {
  k: keyof Omit<Form, "origem">;
  rotulo: string;
  tipo?: string;
  auto?: string;
  modo?: "tel" | "email" | "url";
}[] = [
  { k: "empresa", rotulo: "Empresa *", auto: "organization" },
  { k: "contato", rotulo: "Nome do contato *", auto: "name" },
  { k: "papel", rotulo: "Cargo ou papel", auto: "organization-title" },
  { k: "whatsapp", rotulo: "WhatsApp", tipo: "tel", auto: "tel", modo: "tel" },
  { k: "email", rotulo: "E-mail", tipo: "email", auto: "email", modo: "email" },
  { k: "segmento", rotulo: "Segmento" },
  { k: "cidade", rotulo: "Cidade", auto: "address-level2" },
  { k: "anuncio", rotulo: "Qual anúncio" },
  { k: "indicado_por", rotulo: "Quem indicou" },
  { k: "site_atual", rotulo: "Site atual", tipo: "url", modo: "url" },
];

/** Editar os dados da ficha. Só envia o que mudou; confere a versão no banco. */
export function EditarClientePainel({
  c,
  aberto,
  aoMudar,
}: {
  c: ClienteLinha;
  aberto: boolean;
  aoMudar: (v: boolean) => void;
}) {
  const [f, setF] = useState<Form>(deCliente(c));
  const qc = useQueryClient();
  useEffect(() => {
    if (aberto) setF(deCliente(c));
  }, [aberto, c]);

  const salvar = useMutation({
    mutationFn: (mudancas: CamposCliente) => salvarCliente(c.id, c.updated_at, mudancas),
    onSuccess: () => {
      ok("Ficha atualizada.");
      aoMudar(false);
    },
    onError: (e, v) => erro(mensagemAmigavel(e), { tentarDeNovo: () => salvar.mutate(v) }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: chavesClientes.tudo });
      void qc.invalidateQueries({ queryKey: chavesFunil.tudo });
    },
  });

  function enviar() {
    const original = deCliente(c);
    const mudancas: Record<string, string> = {};
    (Object.keys(f) as (keyof Form)[]).forEach((k) => {
      if (f[k] !== original[k]) mudancas[k] = f[k];
    });
    if (Object.keys(mudancas).length === 0) {
      aoMudar(false);
      return;
    }
    salvar.mutate(mudancas as CamposCliente);
  }

  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Editar ficha"
      descricao={c.company_name}
      rodape={
        <>
          <Button variant="outline" className="h-11" onClick={() => aoMudar(false)}>
            Cancelar
          </Button>
          <Button
            className="h-11 bg-[#FFB020] text-hub-tinta hover:bg-[#F5A50F]"
            disabled={salvar.isPending}
            onClick={enviar}
          >
            {salvar.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {campos.map((campo) => (
          <div key={campo.k} className="flex flex-col gap-1.5">
            <Label htmlFor={`ed-${campo.k}`}>{campo.rotulo}</Label>
            <Input
              id={`ed-${campo.k}`}
              list={campo.k === "anuncio" ? idSugestoesCampanhas : undefined}
              type={campo.tipo ?? "text"}
              inputMode={campo.modo}
              autoComplete={campo.auto ?? "off"}
              value={f[campo.k]}
              onChange={(e) => setF((x) => ({ ...x, [campo.k]: e.target.value }))}
              className="h-11"
            />
          </div>
        ))}
        <SugestoesCampanhas ativo={aberto} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ed-origem">Origem</Label>
          <select
            id="ed-origem"
            value={f.origem}
            onChange={(e) => setF((x) => ({ ...x, origem: e.target.value as Origem }))}
            className="h-11 rounded-md border border-input bg-white px-3 text-base md:text-[15px]"
          >
            {origens.map((o) => (
              <option key={o.id} value={o.id}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </div>
      </div>
    </PainelLateral>
  );
}
