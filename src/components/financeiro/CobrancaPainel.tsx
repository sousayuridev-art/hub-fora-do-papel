import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { FileText, MessageCircle } from "lucide-react";

import { CampoArea, CampoEscolha, CampoTexto } from "@/components/hub/Campo";
import { CampoDinheiro } from "@/components/hub/CampoDinheiro";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { Selo } from "@/components/hub/Selo";
import { Button } from "@/components/ui/button";
import { mensagemCobranca, mensagemRecibo } from "@/lib/mensagens";
import { classeAcaoTexto, classeBotaoSecundario } from "@/lib/estilos";
import { dataLocal, diaMes, isoDoDia, linkWhatsapp, moeda } from "@/lib/formatar";
import {
  rotuloForma,
  rotuloTipoCobranca,
  situacaoDaCobranca,
  type CobrancaLinha,
  type Forma,
} from "@/lib/financeiro";

const amarelo = "h-11 bg-[#FFB020] text-hub-tinta hover:bg-[#F5A50F]";

type Modo = "ver" | "pagar" | "vencimento" | "cancelar";

export type AcoesCobranca = {
  aoPagar: (v: {
    id: string;
    data: string;
    valorCents: number;
    forma: Forma;
    nota: string;
    restante: boolean;
  }) => void;
  aoDesfazer: (c: CobrancaLinha) => void;
  aoVencimento: (c: CobrancaLinha, data: string) => void;
  aoCancelar: (c: CobrancaLinha, motivo: string) => void;
};

/** Painel da cobrança: registrar pagamento, mudar vencimento, cancelar, desfazer e lembrar pelo WhatsApp. */
export function CobrancaPainel({
  c,
  hoje,
  remetente,
  aoFechar,
  pagarAoAbrir = false,
  ...a
}: {
  c: CobrancaLinha | null;
  hoje: string;
  remetente: string;
  aoFechar: () => void;
  /** Botão "Recebi" da lista: abre direto no registro do pagamento (card RD-3). */
  pagarAoAbrir?: boolean;
} & AcoesCobranca) {
  const [modo, setModo] = useState<Modo>("ver");
  const [data, setData] = useState(hoje);
  const [valor, setValor] = useState<number | null>(null);
  const [forma, setForma] = useState<Forma>("pix");
  const [nota, setNota] = useState("");
  const [restante, setRestante] = useState(true);
  const [vencimento, setVencimento] = useState("");
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    setModo(pagarAoAbrir && c?.situacao === "aberta" ? "pagar" : "ver");
    setData(hoje);
    setValor(c?.valor_cents ?? null);
    setForma("pix");
    setNota("");
    setRestante(true);
    setVencimento(c?.vencimento ?? "");
    setMotivo("");
  }, [c, hoje, pagarAoAbrir]);

  if (!c)
    return (
      <PainelLateral aberto={false} aoMudar={aoFechar} titulo="Cobrança">
        {null}
      </PainelLateral>
    );
  const s = situacaoDaCobranca(c, hoje);
  const portal = typeof window !== "undefined" ? `${window.location.origin}/portal/pagamentos` : "";
  const wpp = linkWhatsapp(c.whatsapp);
  // Textos de lib/mensagens (card CX-1): cobrança antes, no dia ou atrasada; recibo depois de pago.
  const mensagem = mensagemCobranca({
    contato: c.contato,
    remetente,
    descricao: c.descricao,
    valorCents: c.valor_cents,
    vencimento: c.vencimento ? diaMes(dataLocal(c.vencimento)) : null,
    diasAtraso: c.dias_atraso,
    hoje: c.vencimento === hoje,
    link: portal,
  }).whatsapp;
  const mensagemPago = mensagemRecibo({
    contato: c.contato,
    remetente,
    descricao: c.descricao,
    link: portal,
  }).whatsapp;
  const parcial = valor !== null && valor > 0 && valor < c.valor_cents;
  const fechar = (f: () => void) => () => {
    f();
    aoFechar();
  };

  let rodape: React.ReactNode = null;
  if (modo === "pagar")
    rodape = (
      <>
        <Button variant="outline" className="h-11" onClick={() => setModo("ver")}>
          Voltar
        </Button>
        <Button
          className={amarelo}
          disabled={!valor || valor < 1 || !data || data > hoje}
          onClick={fechar(() =>
            a.aoPagar({
              id: c.id,
              data,
              valorCents: valor ?? 0,
              forma,
              nota: nota.trim(),
              restante: parcial && restante,
            }),
          )}
        >
          Registrar pagamento
        </Button>
      </>
    );
  else if (modo === "vencimento")
    rodape = (
      <>
        <Button variant="outline" className="h-11" onClick={() => setModo("ver")}>
          Voltar
        </Button>
        <Button
          className={amarelo}
          disabled={!vencimento}
          onClick={fechar(() => a.aoVencimento(c, vencimento))}
        >
          Salvar vencimento
        </Button>
      </>
    );
  else if (modo === "cancelar")
    rodape = (
      <>
        <Button variant="outline" className="h-11" onClick={() => setModo("ver")}>
          Voltar
        </Button>
        <Button
          className="h-11 bg-[#9A1C12] text-white hover:bg-[#7F160E]"
          disabled={motivo.trim().length < 5}
          onClick={fechar(() => a.aoCancelar(c, motivo.trim()))}
        >
          Cancelar cobrança
        </Button>
      </>
    );
  else if (c.situacao === "aberta")
    rodape = (
      <>
        <Button variant="outline" className="h-11 sm:mr-auto" onClick={() => setModo("cancelar")}>
          Cancelar
        </Button>
        <Button variant="outline" className="h-11" onClick={() => setModo("vencimento")}>
          {c.vencimento ? "Mudar vencimento" : "Definir vencimento"}
        </Button>
        <Button className={amarelo} onClick={() => setModo("pagar")}>
          Registrar pagamento
        </Button>
      </>
    );
  else if (c.situacao === "paga")
    rodape = (
      <Button variant="outline" className="h-11" onClick={fechar(() => a.aoDesfazer(c))}>
        Desfazer pagamento
      </Button>
    );

  return (
    <PainelLateral
      aberto
      aoMudar={(v) => !v && aoFechar()}
      titulo={c.descricao}
      descricao={`${c.empresa}${c.projeto ? ` · ${c.projeto}` : ""}`}
      rodape={rodape}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Selo tom={s.tom}>{s.texto}</Selo>
          <span className="text-[13.5px] text-hub-suave">{rotuloTipoCobranca[c.tipo]}</span>
        </div>
        <div className="flex flex-wrap gap-x-4">
          <Link
            to="/app/clientes/$id"
            params={{ id: c.client_id }}
            className={`${classeAcaoTexto}`}
          >
            Ficha de {c.empresa} ›
          </Link>
          {c.project_id && (
            <Link
              to="/app/projetos/$id"
              params={{ id: c.project_id }}
              className={`${classeAcaoTexto}`}
            >
              Abrir o projeto ›
            </Link>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-hub-fundo p-4 text-[14.5px]">
          <div>
            <dt className="text-hub-suave">Valor</dt>
            <dd className="font-titulo text-xl font-bold tabular-nums">{moeda(c.valor_cents)}</dd>
          </div>
          <div>
            <dt className="text-hub-suave">{c.situacao === "paga" ? "Paga em" : "Vencimento"}</dt>
            <dd className="font-medium">
              {c.situacao === "paga"
                ? `${c.pago_em ? diaMes(dataLocal(c.pago_em)) : "—"} · ${c.forma ? rotuloForma[c.forma] : ""}`
                : c.vencimento
                  ? diaMes(dataLocal(c.vencimento))
                  : (c.quando ?? "Sem data")}
            </dd>
          </div>
          {c.dias_atraso > 0 && (
            <div className="col-span-2 text-sit-risco-t">
              <dt className="font-medium">Com o atraso de {c.dias_atraso} dias</dt>
              <dd>
                Multa {moeda(c.multa_cents)} + juros {moeda(c.juros_cents)} = total{" "}
                <strong>{moeda(c.valor_cents + c.multa_cents + c.juros_cents)}</strong>.{" "}
                {c.dias_atraso >= 10
                  ? "Pelas regras, o trabalho novo pode ser pausado até o pagamento. Você decide."
                  : "Só para referência; nada é cobrado sozinho."}
              </dd>
            </div>
          )}
          {c.situacao === "paga" && c.pago_cents !== c.valor_cents && (
            <div className="col-span-2">
              <dt className="text-hub-suave">Valor pago</dt>
              <dd className="font-medium">{moeda(c.pago_cents)}</dd>
            </div>
          )}
        </dl>
        {c.cliente_avisou_em && c.situacao === "aberta" && (
          <p className="rounded-xl bg-sit-info p-4 text-[14.5px] text-sit-info-t">
            O cliente avisou no portal que já pagou. Confira no banco e registre o pagamento.
          </p>
        )}

        {modo === "pagar" && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <CampoTexto rotulo="Pago em" tipo="date" valor={data} aoMudar={setData} max={hoje} />
              <CampoDinheiro rotulo="Valor pago" valor={valor} aoMudar={setValor} />
            </div>
            <CampoEscolha<Forma>
              rotulo="Forma"
              valor={forma}
              aoMudar={setForma}
              opcoes={(Object.keys(rotuloForma) as Forma[]).map((f) => ({
                id: f,
                rotulo: rotuloForma[f],
              }))}
            />
            {parcial && (
              <label className="flex min-h-11 items-center gap-3 text-[14.5px]">
                <input
                  type="checkbox"
                  checked={restante}
                  onChange={(e) => setRestante(e.target.checked)}
                  className="size-5 accent-[#0E1013]"
                />
                Cobrar o restante ({moeda(c.valor_cents - (valor ?? 0))}) em 7 dias
              </label>
            )}
            <CampoArea
              rotulo="Observação (opcional)"
              valor={nota}
              aoMudar={setNota}
              maxLength={300}
              linhas={2}
            />
            <p className="text-[13.5px] text-hub-suave">
              O recibo fica disponível para o cliente no portal.
            </p>
          </div>
        )}
        {modo === "vencimento" && (
          <CampoTexto
            rotulo="Novo vencimento"
            tipo="date"
            valor={vencimento}
            aoMudar={setVencimento}
            min={isoDoDia(new Date())}
          />
        )}
        {modo === "cancelar" && (
          <CampoArea
            rotulo="Motivo do cancelamento"
            valor={motivo}
            aoMudar={setMotivo}
            maxLength={300}
            linhas={2}
          />
        )}

        {modo === "ver" && (
          <div className="flex flex-col gap-2">
            {c.situacao === "aberta" && wpp && (
              <a
                href={`${wpp}?text=${encodeURIComponent(mensagem)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`${classeBotaoSecundario} self-start`}
              >
                <MessageCircle className="size-4" aria-hidden="true" /> Lembrar pelo WhatsApp
              </a>
            )}
            {c.situacao === "paga" && wpp && (
              <a
                href={`${wpp}?text=${encodeURIComponent(mensagemPago)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`${classeBotaoSecundario} self-start`}
              >
                <MessageCircle className="size-4" aria-hidden="true" /> Avisar que o recibo está
                pronto
              </a>
            )}
            {c.situacao === "paga" && (
              <Link
                to="/recibo/$id"
                params={{ id: c.id }}
                target="_blank"
                className={`${classeBotaoSecundario} self-start`}
              >
                <FileText className="size-4" aria-hidden="true" /> Ver recibo nº {c.recibo}
              </Link>
            )}
          </div>
        )}
      </div>
    </PainelLateral>
  );
}
