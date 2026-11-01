import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";

import { EstadoErro } from "@/components/hub/EstadoErro";
import { FiltrosChip } from "@/components/hub/FiltrosChip";
import { Selo } from "@/components/hub/Selo";
import {
  chavesContatos,
  contatosDoSite,
  linkWhatsApp,
  mensagemDoContato,
  telefoneLegivel,
  type FiltroContatos,
} from "@/lib/contatosSite";
import { classeAcaoTexto } from "@/lib/estilos";
import { diaComHora } from "@/lib/formatar";

/**
 * Contatos que chegaram pelo site do cliente (RD2-8), do lado do Hub. Quem responde é o cliente,
 * pelo painel; aqui o Yuri acompanha e, se precisar, abre o WhatsApp com a mensagem pronta.
 */
export function SiteContatos({ siteId, empresa }: { siteId: string; empresa: string }) {
  const [filtro, setFiltro] = useState<FiltroContatos>("esperando");
  const q = useQuery({
    queryKey: chavesContatos.lista(siteId, filtro),
    queryFn: () => contatosDoSite(siteId, filtro),
  });
  const d = q.data;

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <FiltrosChip<FiltroContatos>
        rotulo="Quais contatos"
        ativo={filtro}
        aoEscolher={setFiltro}
        opcoes={[
          { id: "esperando", rotulo: "Esperando resposta", contagem: d?.contagem.esperando },
          { id: "todos", rotulo: "Todos", contagem: d?.contagem.todos },
        ]}
      />
      {q.isError ? (
        <EstadoErro
          titulo={mensagemDoContato(q.error) ?? "Não foi possível carregar os contatos"}
          aoTentarDeNovo={() => void q.refetch()}
        />
      ) : !d ? (
        <div className="h-48 animate-pulse rounded-2xl bg-white" aria-busy="true" />
      ) : d.itens.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#D6D6CF] bg-white p-6 text-[15px] text-hub-suave">
          {filtro === "esperando"
            ? "Ninguém esperando resposta."
            : "Nenhum contato pelo site ainda."}
        </p>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-2xl border border-[#E3E7ED] bg-white">
          {d.itens.map((c) => {
            const wpp = linkWhatsApp(c, empresa);
            return (
              <li
                key={c.id}
                className="flex flex-col gap-2 border-t border-[#EEF1F5] px-5 py-4 first:border-t-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <span className="flex min-w-0 flex-col gap-1 text-[14px]">
                  <span className="flex flex-wrap items-center gap-2">
                    <b className="font-semibold">{c.nome ?? "Sem nome"}</b>
                    <Selo tom={c.origem === "whatsapp" ? "info" : "neutro"}>
                      {c.origem === "whatsapp" ? "Clicou no WhatsApp" : "Formulário"}
                    </Selo>
                    {c.origem === "formulario" &&
                      (c.respondido ? (
                        <Selo tom="ok">Respondido</Selo>
                      ) : (
                        <Selo tom="atencao">Esperando</Selo>
                      ))}
                  </span>
                  <span className="text-[13px] text-hub-suave">
                    {[telefoneLegivel(c.telefone), c.email, c.pagina, diaComHora(c.criado_em)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {c.mensagem && <span className="whitespace-pre-line">{c.mensagem}</span>}
                </span>
                {wpp && (
                  <a
                    href={wpp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${classeAcaoTexto} shrink-0 self-start`}
                  >
                    <MessageCircle className="size-4" aria-hidden="true" /> WhatsApp
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
