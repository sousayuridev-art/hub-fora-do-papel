import { SugestoesCampanhas, idSugestoesCampanhas } from "@/components/trafego/SugestoesCampanhas";
import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { CamposProximoPasso } from "@/components/funil/CamposProximoPasso";
import { mensagemAmigavel } from "@/components/funil/useMutacoesFunil";
import { centavosDoTexto, isoDoDia } from "@/lib/formatar";
import {
  chavesClientes,
  chavesFunil,
  criarContato,
  origens,
  type NovoContato,
  type Origem,
  type ProximoPasso,
} from "@/lib/funil";
import { erro, ok } from "@/lib/notify";

const vazio = (): NovoContato => ({
  empresa: "",
  contato: "",
  whatsapp: "",
  email: "",
  origem: "indicacao",
  proximoPasso: "Primeiro contato pelo WhatsApp",
  data: isoDoDia(new Date()),
  hora: "",
  segmento: "",
  cidade: "",
  anuncio: "",
  indicadoPor: "",
  siteAtual: "",
  valorCents: null,
});

function Campo({
  id,
  rotulo,
  children,
}: {
  id: string;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
    </div>
  );
}

/** Novo contato (painel lateral; painel de baixo no celular). Cria ficha + oportunidade em Contato. */
export function NovoContatoPainel({
  aberto,
  aoMudar,
}: {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
}) {
  const [f, setF] = useState<NovoContato>(vazio);
  const [valorTexto, setValorTexto] = useState("");
  const [tentou, setTentou] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const criar = useMutation({
    mutationFn: criarContato,
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: chavesFunil.tudo });
      void qc.invalidateQueries({ queryKey: chavesClientes.tudo });
      aoMudar(false);
      setF(vazio());
      setValorTexto("");
      setTentou(false);
      if (r.reaproveitado) {
        ok("Esse contato já estava no funil. Abrimos a ficha dele.");
        void navigate({ to: "/app/clientes/$id", params: { id: r.client_id } });
      } else {
        ok("Contato criado em Contato.");
      }
    },
    onError: (e, v) => erro(mensagemAmigavel(e), { tentarDeNovo: () => criar.mutate(v) }),
  });

  const faltaContato = !f.contato.trim();
  const faltaCanal = !f.whatsapp.trim() && !f.email.trim();
  const faltaPasso = !f.proximoPasso.trim() || !f.data;

  function enviar(e: FormEvent) {
    e.preventDefault();
    setTentou(true);
    if (faltaContato || faltaCanal || faltaPasso) return;
    criar.mutate({ ...f, valorCents: centavosDoTexto(valorTexto) });
  }

  const set = <K extends keyof NovoContato>(k: K, v: NovoContato[K]) =>
    setF((x) => ({ ...x, [k]: v }));
  const passo: ProximoPasso = { texto: f.proximoPasso, data: f.data, hora: f.hora };

  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Novo contato"
      descricao="Entra no funil em Contato, com o próximo passo e a data."
      rodape={
        <>
          <Button variant="outline" className="h-11" onClick={() => aoMudar(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-novo-contato"
            className="h-11 bg-[#FFB020] text-hub-tinta hover:bg-[#F5A50F]"
            disabled={criar.isPending}
          >
            {criar.isPending ? "Criando…" : "Criar contato"}
          </Button>
        </>
      }
    >
      <form id="form-novo-contato" onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <Campo id="nc-empresa" rotulo="Empresa">
          <Input
            id="nc-empresa"
            value={f.empresa}
            maxLength={120}
            autoComplete="organization"
            onChange={(e) => set("empresa", e.target.value)}
            placeholder="Se for pessoa física, deixe em branco"
            className="h-11"
          />
        </Campo>
        <Campo id="nc-contato" rotulo="Nome do contato *">
          <Input
            id="nc-contato"
            value={f.contato}
            maxLength={100}
            autoComplete="name"
            onChange={(e) => set("contato", e.target.value)}
            className="h-11"
            aria-invalid={tentou && faltaContato}
          />
          {tentou && faltaContato && (
            <p className="text-[13px] text-sit-risco-t">Informe o nome.</p>
          )}
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="nc-whatsapp" rotulo="WhatsApp">
            <Input
              id="nc-whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={f.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)}
              placeholder="(79) 9 0000-0000"
              className="h-11"
              aria-invalid={tentou && faltaCanal}
            />
          </Campo>
          <Campo id="nc-email" rotulo="E-mail">
            <Input
              id="nc-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={f.email}
              onChange={(e) => set("email", e.target.value)}
              className="h-11"
              aria-invalid={tentou && faltaCanal}
            />
          </Campo>
        </div>
        {tentou && faltaCanal && (
          <p className="-mt-2 text-[13px] text-sit-risco-t">Informe o WhatsApp ou o e-mail.</p>
        )}
        <Campo id="nc-origem" rotulo="Origem *">
          <select
            id="nc-origem"
            value={f.origem}
            onChange={(e) => set("origem", e.target.value as Origem)}
            className="h-11 rounded-md border border-input bg-white px-3 text-base md:text-[15px]"
          >
            {origens.map((o) => (
              <option key={o.id} value={o.id}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </Campo>
        {(f.origem === "anuncio_meta" || f.origem === "anuncio_google") && (
          <Campo id="nc-anuncio" rotulo="Qual anúncio">
            <Input
              id="nc-anuncio"
              list={idSugestoesCampanhas}
              value={f.anuncio}
              maxLength={120}
              onChange={(e) => set("anuncio", e.target.value)}
              className="h-11"
            />
            <SugestoesCampanhas ativo={aberto} />
          </Campo>
        )}
        {f.origem === "indicacao" && (
          <Campo id="nc-indicacao" rotulo="Quem indicou">
            <Input
              id="nc-indicacao"
              value={f.indicadoPor}
              maxLength={120}
              onChange={(e) => set("indicadoPor", e.target.value)}
              className="h-11"
            />
          </Campo>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="nc-segmento" rotulo="Segmento">
            <Input
              id="nc-segmento"
              value={f.segmento}
              maxLength={60}
              onChange={(e) => set("segmento", e.target.value)}
              placeholder="Ex.: Odontologia"
              className="h-11"
            />
          </Campo>
          <Campo id="nc-cidade" rotulo="Cidade">
            <Input
              id="nc-cidade"
              value={f.cidade}
              maxLength={80}
              autoComplete="address-level2"
              onChange={(e) => set("cidade", e.target.value)}
              placeholder="Ex.: Aracaju/SE"
              className="h-11"
            />
          </Campo>
        </div>
        <Campo id="nc-valor" rotulo="Valor estimado (opcional)">
          <Input
            id="nc-valor"
            inputMode="decimal"
            value={valorTexto}
            onChange={(e) => setValorTexto(e.target.value)}
            placeholder="R$"
            className="h-11"
          />
        </Campo>
        <div className="border-t border-hub-borda pt-4">
          <CamposProximoPasso
            valor={passo}
            prefixo="nc"
            erroTexto={tentou && faltaPasso ? "Defina o próximo passo e a data." : null}
            aoMudar={(p) =>
              setF((x) => ({ ...x, proximoPasso: p.texto, data: p.data, hora: p.hora }))
            }
          />
        </div>
      </form>
    </PainelLateral>
  );
}
