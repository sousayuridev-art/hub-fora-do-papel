import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BotoesPainel } from "@/components/hub/BotoesPainel";
import { CampoArea, CampoEscolha, CampoTexto } from "@/components/hub/Campo";
import { PainelLateral } from "@/components/hub/PainelLateral";
import { chavesAgenda, dataIso, marcarReuniao, mensagemDaAgenda } from "@/lib/agenda";
import { chavesClientes, listarClientes } from "@/lib/funil";
import { erro, ok } from "@/lib/notify";

const duracoes = [
  { id: "30", rotulo: "30 minutos" },
  { id: "45", rotulo: "45 minutos" },
  { id: "60", rotulo: "1 hora" },
  { id: "90", rotulo: "1 hora e meia" },
] as const;
type Duracao = (typeof duracoes)[number]["id"];

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

/** Próximo dia útil (hoje, se for de segunda a sexta). */
function proximoDiaUtil(): string {
  const d = new Date();
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return dataIso(d);
}

/**
 * Marcar reunião (card RD2-3): cria o evento na Google Agenda com link do Meet e
 * convite para os convidados. O e-mail do cliente escolhido entra sozinho.
 */
export function MarcarReuniaoPainel({
  aberto,
  aoMudar,
}: {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const clientes = useQuery({
    queryKey: chavesClientes.lista,
    queryFn: listarClientes,
    enabled: aberto,
  });
  const [titulo, setTitulo] = useState("Conversa inicial");
  const [cliente, setCliente] = useState("");
  const [data, setData] = useState(proximoDiaUtil());
  const [horaIni, setHoraIni] = useState("10:00");
  const [duracao, setDuracao] = useState<Duracao>("30");
  const [convidados, setConvidados] = useState("");
  const [descricao, setDescricao] = useState("");

  useEffect(() => {
    if (!aberto) return;
    setTitulo("Conversa inicial");
    setCliente("");
    setData(proximoDiaUtil());
    setHoraIni("10:00");
    setDuracao("30");
    setConvidados("");
    setDescricao("");
  }, [aberto]);

  const doCliente = clientes.data?.find((c) => c.id === cliente);
  const emails = [
    ...new Set(
      [doCliente?.email ?? "", ...convidados.split(/[\s,;]+/)]
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  const invalidos = emails.filter((x) => !EMAIL.test(x));
  const inicio = new Date(`${data}T${horaIni || "00:00"}:00`);
  const valido =
    titulo.trim().length >= 2 && !Number.isNaN(inicio.getTime()) && invalidos.length === 0;

  const marcar = useMutation({
    mutationFn: () => {
      const fim = new Date(inicio.getTime() + Number(duracao) * 60_000);
      return marcarReuniao({
        titulo: titulo.trim(),
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
        convidados: emails,
        ...(descricao.trim() ? { descricao: descricao.trim() } : {}),
      });
    },
    onSuccess: () => {
      ok(
        emails.length
          ? "Reunião marcada. O convite com o Meet foi para os convidados."
          : "Reunião marcada na sua Google Agenda, com link do Meet.",
      );
      aoMudar(false);
      void qc.invalidateQueries({ queryKey: chavesAgenda.tudo });
    },
    onError: (e) => erro(mensagemDaAgenda(e), { tentarDeNovo: () => marcar.mutate() }),
  });

  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Marcar reunião"
      descricao="Cria o evento na sua Google Agenda, com link do Meet."
      rodape={
        <BotoesPainel
          rotulo={marcar.isPending ? "Marcando…" : "Marcar e enviar convite"}
          desabilitado={!valido || marcar.isPending}
          aoCancelar={() => aoMudar(false)}
          aoConfirmar={() => marcar.mutate()}
        />
      }
    >
      <div className="flex flex-col gap-4">
        <CampoTexto rotulo="Título" valor={titulo} aoMudar={setTitulo} maxLength={200} />
        <CampoEscolha
          rotulo="Cliente (opcional)"
          valor={cliente}
          aoMudar={setCliente}
          vazio={clientes.isPending ? "Carregando…" : "Sem cliente"}
          opcoes={(clientes.data ?? [])
            .filter((c) => c.situacao !== "arquivado")
            .map((c) => ({ id: c.id, rotulo: c.company_name }))}
        />
        {doCliente && !doCliente.email && (
          <p className="-mt-2 text-[13px] text-sit-atencao-t">
            Este cliente não tem e-mail no cadastro. Escreva o e-mail em Convidados.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <CampoTexto rotulo="Dia" tipo="date" valor={data} aoMudar={setData} />
          <CampoTexto rotulo="Hora" tipo="time" valor={horaIni} aoMudar={setHoraIni} />
        </div>
        <CampoEscolha<Duracao>
          rotulo="Duração"
          valor={duracao}
          aoMudar={setDuracao}
          opcoes={duracoes.map((d) => ({ id: d.id, rotulo: d.rotulo }))}
        />
        <CampoArea
          rotulo="Convidados"
          ajuda={
            doCliente?.email
              ? `${doCliente.email} já entra. Outros e-mails separados por vírgula.`
              : "E-mails separados por vírgula."
          }
          valor={convidados}
          aoMudar={setConvidados}
          maxLength={2000}
        />
        {invalidos.length > 0 && (
          <p className="-mt-2 text-[13px] text-sit-risco-t">Confira: {invalidos.join(", ")}</p>
        )}
        <CampoArea
          rotulo="Descrição (opcional)"
          valor={descricao}
          aoMudar={setDescricao}
          maxLength={2000}
        />
      </div>
    </PainelLateral>
  );
}
