import { useState } from "react";
import { Check, MoreHorizontal, Plus, RotateCcw, Send, Trash2, X } from "lucide-react";

import { EnviarParaPainel } from "@/components/hub/EnviarParaPainel";
import { Selo } from "@/components/hub/Selo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { classeAcaoTexto, classeBotaoSecundario } from "@/lib/estilos";
import { dataLocal, diaMes, moeda } from "@/lib/formatar";
import { mensagemAdicional, mensagemEntrega, mensagemLembrete } from "@/lib/mensagens";
import { diasDesde, type DetalheProjeto } from "@/lib/projetos";
import { cn } from "@/lib/utils";

type Acoes = {
  aoPedirAprovacao: () => void;
  aoNovaPendencia: () => void;
  aoMarcarPendencia: (id: string, feita: boolean) => void;
  aoRemoverPendencia: (id: string) => void;
  aoCancelarAprovacao: (id: string) => void;
  aoReenviar: (titulo: string, faseId: string | null) => void;
  remetente: string;
};

/**
 * O que depende do cliente (mesma conta do portal dele) e o que ele devolveu pedindo ajuste.
 * Aprovação nunca é automática: fica aqui até o cliente responder.
 */
export function AguardandoCliente({ d, ...a }: { d: DetalheProjeto } & Acoes) {
  const aprovacoes = d.aprovacoes.filter((x) => x.status === "aguardando");
  // Ajustes pedidos que ainda não ganharam uma nova versão enviada
  const ajustes = d.aprovacoes
    .filter(
      (x) =>
        x.status === "ajuste" &&
        !d.aprovacoes.some((y) => x.decided_at !== null && y.sent_at > x.decided_at),
    )
    .slice(0, 3);
  const pendencias = d.pendencias.filter((x) => x.status === "aberta");
  const feitas = d.pendencias.filter((x) => x.status === "feita").slice(0, 3);
  const adicionais = d.pedidos.filter((x) => x.status === "aguardando_cliente");
  const total = aprovacoes.length + pendencias.length + adicionais.length;
  const nome = d.cliente.contato?.split(" ")[0] ?? "o cliente";
  const portal = typeof window !== "undefined" ? `${window.location.origin}/portal` : "/portal";
  const [enviando, setEnviando] = useState(false);
  // Um item só ganha a mensagem própria (entrega ou serviço adicional); vários viram lembrete (CX-1).
  const itens = [
    ...aprovacoes.map((x) => `Aprovar: ${x.title}`),
    ...adicionais.map((x) => `Decidir o serviço adicional: ${x.title}`),
    ...pendencias.map((x) => x.title),
  ];
  const gerar = (nota: string) => {
    const b = { contato: d.cliente.contato, remetente: a.remetente, nota };
    const so = total === 1;
    if (so && aprovacoes[0])
      return mensagemEntrega({
        ...b,
        titulo: aprovacoes[0].title,
        conferir: aprovacoes[0].description,
        link: `${portal}/aprovacoes`,
      });
    if (so && adicionais[0])
      return mensagemAdicional({
        ...b,
        titulo: adicionais[0].title,
        valorCents: adicionais[0].value_cents,
        link: `${portal}/aprovacoes`,
      });
    return mensagemLembrete({ ...b, itens, link: portal });
  };

  return (
    <section
      aria-labelledby="aguardando-t"
      className="flex flex-col gap-4 rounded-2xl border border-hub-borda bg-white p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 id="aguardando-t" className="font-titulo text-lg font-bold">
            Aguardando o cliente ({total})
          </h2>
          <p className="text-[14px] text-hub-suave">
            O que depende de {nome}. O mesmo número aparece no portal.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {total > 0 && (
            <button
              type="button"
              className={classeBotaoSecundario}
              onClick={() => setEnviando(true)}
            >
              <Send className="size-4" aria-hidden="true" /> Avisar {nome}
            </button>
          )}
          <button type="button" className={classeBotaoSecundario} onClick={a.aoNovaPendencia}>
            <Plus className="size-4" aria-hidden="true" /> Pendência
          </button>
          <button type="button" className={classeBotaoSecundario} onClick={a.aoPedirAprovacao}>
            <Plus className="size-4" aria-hidden="true" /> Pedir aprovação
          </button>
        </div>
      </div>

      {ajustes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {ajustes.map((x) => (
            <li
              key={x.id}
              className="flex flex-col gap-1 rounded-xl bg-sit-atencao p-4 text-sit-atencao-t"
            >
              <span className="flex items-center gap-2 text-[14.5px] font-semibold">
                <RotateCcw className="size-4" aria-hidden="true" /> {nome} pediu ajuste em "
                {x.title}"
              </span>
              {x.decision_note && <span className="text-[14px]">"{x.decision_note}"</span>}
              <button
                type="button"
                onClick={() => a.aoReenviar(x.title, x.phase_id)}
                className={`${classeAcaoTexto} self-start`}
              >
                Enviar a nova versão
              </button>
            </li>
          ))}
        </ul>
      )}

      {total === 0 ? (
        <p className="rounded-xl bg-hub-fundo p-4 text-[14.5px] text-hub-suave">
          Nada esperando {nome} agora.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {aprovacoes.map((x) => (
            <li key={x.id} className="flex flex-col gap-2 rounded-xl border border-hub-borda p-4">
              <div className="flex items-start justify-between gap-2">
                <Selo tom="atencao">Aprovar</Selo>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="-m-2 flex size-11 items-center justify-center rounded-lg hover:bg-hub-fundo"
                    aria-label={`Mais ações para ${x.title}`}
                  >
                    <MoreHorizontal className="size-4" aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="min-h-11"
                      onSelect={() => a.aoCancelarAprovacao(x.id)}
                    >
                      <X className="size-4" aria-hidden="true" /> Cancelar pedido de aprovação
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <span className="font-semibold">{x.title}</span>
              <span className="text-[13.5px] text-hub-suave">
                {(() => {
                  const dias = diasDesde(x.sent_at, d.hoje);
                  return dias === 0
                    ? `Enviado hoje · fica aqui até ${nome} responder`
                    : `Enviado ${diaMes(x.sent_at)} · esperando há ${dias} ${dias === 1 ? "dia" : "dias"}`;
                })()}
              </span>
            </li>
          ))}
          {adicionais.map((x) => (
            <li key={x.id} className="flex flex-col gap-2 rounded-xl border border-hub-borda p-4">
              <span className="self-start">
                <Selo tom="info">Serviço adicional</Selo>
              </span>
              <span className="font-semibold">
                {x.code} · {x.title}
              </span>
              <span className="text-[13.5px] text-hub-suave">
                {x.hours_estimated?.toLocaleString("pt-BR")} h · {moeda(x.value_cents)} · decide no
                portal
              </span>
            </li>
          ))}
          {pendencias.map((x) => {
            const atrasada = x.due_date !== null && x.due_date < d.hoje;
            return (
              <li key={x.id} className="flex flex-col gap-2 rounded-xl border border-hub-borda p-4">
                <div className="flex items-start justify-between gap-2">
                  <Selo tom={atrasada ? "risco" : "neutro"}>
                    {atrasada ? "Atrasada" : "Pendência"}
                  </Selo>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="-m-2 flex size-11 items-center justify-center rounded-lg hover:bg-hub-fundo"
                      aria-label={`Mais ações para ${x.title}`}
                    >
                      <MoreHorizontal className="size-4" aria-hidden="true" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="min-h-11"
                        onSelect={() => a.aoMarcarPendencia(x.id, true)}
                      >
                        <Check className="size-4" aria-hidden="true" /> Marcar como feita
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="min-h-11"
                        onSelect={() => a.aoRemoverPendencia(x.id)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" /> Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <span className="font-semibold">{x.title}</span>
                <span
                  className={cn("text-[13.5px]", atrasada ? "text-sit-risco-t" : "text-hub-suave")}
                >
                  {x.due_date ? `Prazo ${diaMes(dataLocal(x.due_date))}` : "Sem prazo"}
                  {x.detail ? ` · ${x.detail}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {feitas.length > 0 && (
        <p className="text-[13.5px] text-hub-suave">
          Feitas recentemente: {feitas.map((f) => f.title).join(", ")}.
        </p>
      )}
      {total > 0 && (
        <EnviarParaPainel
          aberto={enviando}
          aoMudar={setEnviando}
          nome={d.cliente.contato}
          whatsapp={d.cliente.whatsapp}
          email={d.cliente.email}
          link={
            total === 1 && aprovacoes.length + adicionais.length === 1
              ? `${portal}/aprovacoes`
              : portal
          }
          previa={{ titulo: `Portal da ${d.cliente.empresa}`, linha: `${itens[0] ?? ""}` }}
          gerar={gerar}
        />
      )}
    </section>
  );
}
