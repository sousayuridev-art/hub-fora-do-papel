import { Link } from "@tanstack/react-router";
import { Video } from "lucide-react";

import { PainelLateral } from "@/components/hub/PainelLateral";
import { Selo } from "@/components/hub/Selo";
import type { EventoAgenda, LigacaoEvento } from "@/lib/agenda";
import { classeAcaoPrincipal, classeAcaoTexto } from "@/lib/estilos";
import { diaComHora, diaMes, hora, moeda } from "@/lib/formatar";
import { rotuloEtapa } from "@/lib/funil";

/** Uma linha de "Para levar". */
function Item({ children }: { children: React.ReactNode }) {
  return <li className="leading-relaxed">{children}</li>;
}

function textoProposta(p: NonNullable<LigacaoEvento["proposta"]>): string {
  const versao = p.versao > 1 ? `versão ${p.versao}` : "proposta";
  if (p.status === "rascunho") return `Proposta em rascunho (${versao}).`;
  if (p.status === "aceita") return "Proposta aceita.";
  if (p.status === "recusada") return "Proposta recusada.";
  const enviada = p.enviada_em ? ` enviada em ${diaMes(p.enviada_em)}` : " enviada";
  const vista = p.vista_em ? `, vista em ${diaMes(p.vista_em)}` : ", ainda não aberta";
  return `${versao.charAt(0).toUpperCase()}${versao.slice(1)}${enviada}${vista}${p.total_cents ? ` · ${moeda(p.total_cents)}` : ""}.`;
}

/**
 * Detalhes da reunião da agenda (card RD2-3): quando, quem, cliente ligado, "Entrar no Meet"
 * e "Para levar" (etapa, próximo passo, proposta e última conversa). Reunião já gravada
 * leva à transcrição.
 */
export function AgendaEventoPainel({
  evento,
  ligacao,
  aoFechar,
  aoVerGravacao,
}: {
  evento: EventoAgenda | null;
  ligacao: LigacaoEvento | undefined;
  aoFechar: () => void;
  aoVerGravacao: (e: EventoAgenda, l: LigacaoEvento) => void;
}) {
  const quando = evento
    ? evento.dia_inteiro
      ? `${diaMes(evento.inicio)} · dia todo`
      : `${diaComHora(evento.inicio)} às ${hora(evento.fim)}`
    : undefined;
  const futura = evento ? new Date(evento.fim) > new Date() : false;
  const l = ligacao;

  return (
    <PainelLateral
      aberto={evento !== null}
      aoMudar={(a) => !a && aoFechar()}
      titulo={evento?.titulo ?? "Reunião"}
      descricao={quando}
    >
      {evento && (
        <div className="flex flex-col gap-5 text-[14.5px]">
          <div className="flex flex-wrap gap-2">
            {l?.cliente ? (
              <Selo tom="neutro" ponto={false}>
                {l.deal ? `${rotuloEtapa[l.deal.etapa]} · ` : ""}
                {l.cliente.nome}
              </Selo>
            ) : (
              <Selo tom="atencao">Sem cliente ligado</Selo>
            )}
            {evento.convidados.length > 0 && (
              <Selo tom="neutro" ponto={false}>
                {evento.convidados[0]?.nome ?? evento.convidados[0]?.email}
                {evento.convidados.length > 1 ? ` e mais ${evento.convidados.length - 1}` : ""}
              </Selo>
            )}
          </div>

          {evento.meet && futura && (
            <a
              href={evento.meet}
              target="_blank"
              rel="noreferrer noopener"
              className={`${classeAcaoPrincipal} sm:w-full`}
            >
              <Video className="size-4" aria-hidden="true" />
              Entrar no Meet
            </a>
          )}

          {l?.cliente && (
            <section className="flex flex-col gap-2 border-t border-[#EEF1F5] pt-4">
              <h3 className="text-[14px] font-semibold">Para levar</h3>
              <ul className="flex list-disc flex-col gap-1 pl-5">
                {l.deal?.proximo_passo && (
                  <Item>
                    Próximo passo: {l.deal.proximo_passo}
                    {l.deal.quando ? ` (${diaMes(l.deal.quando)})` : ""}.
                  </Item>
                )}
                {l.proposta && <Item>{textoProposta(l.proposta)}</Item>}
                {l.deal?.valor_cents != null && !l.proposta?.total_cents && (
                  <Item>Valor estimado: {moeda(l.deal.valor_cents)}.</Item>
                )}
                {l.ultima_reuniao && <Item>Última reunião: {diaMes(l.ultima_reuniao)}.</Item>}
                {!l.deal && !l.ultima_reuniao && (
                  <Item>Sem oportunidade aberta com este cliente.</Item>
                )}
              </ul>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  to="/app/clientes/$id"
                  params={{ id: l.cliente.id }}
                  className={classeAcaoTexto}
                >
                  Abrir o cliente ›
                </Link>
                {l.deal && (
                  <Link to="/app/pipeline" className={classeAcaoTexto}>
                    Ver em Vendas ›
                  </Link>
                )}
              </div>
            </section>
          )}

          {evento.convidados.length > 0 && (
            <section className="flex flex-col gap-2 border-t border-[#EEF1F5] pt-4">
              <h3 className="text-[14px] font-semibold">Convidados</h3>
              <ul className="flex flex-col gap-1 text-[14px]">
                {evento.convidados.map((c) => (
                  <li key={c.email} className="truncate">
                    {c.nome ? (
                      <>
                        {c.nome} <span className="text-hub-suave">· {c.email}</span>
                      </>
                    ) : (
                      c.email
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {l?.reuniao_id ? (
            <section className="flex flex-col gap-2 border-t border-[#EEF1F5] pt-4">
              <h3 className="text-[14px] font-semibold">Depois da reunião</h3>
              <p className="text-hub-suave">A gravação desta reunião já está no Hub.</p>
              <button
                type="button"
                className={`${classeAcaoTexto} self-start`}
                onClick={() => aoVerGravacao(evento, l)}
              >
                Ver transcrição ›
              </button>
            </section>
          ) : !futura ? (
            <p className="border-t border-[#EEF1F5] pt-4 text-hub-suave">
              A transcrição aparece em Gravações quando o Meet terminar de gerar.
            </p>
          ) : null}

          {!l?.cliente && evento.convidados.length > 0 && (
            <p className="text-[13.5px] text-hub-suave">
              Nenhum convidado está cadastrado como cliente. Depois da reunião, ligue a gravação a
              um cliente em Gravações.
            </p>
          )}
          {evento.local && <p className="text-[13.5px] text-hub-suave">Local: {evento.local}</p>}
        </div>
      )}
    </PainelLateral>
  );
}
