import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Mail, MessageCircle, X } from "lucide-react";

import {
  acessosDoPortal,
  cancelarConvite,
  chavesAcessoPortal,
  convidarParaPortal,
  mensagemDoAcesso,
  mudarPerfil,
  nomeDoPerfil,
  removerAcesso,
  type AcessosPortal,
  type PerfilPortal,
} from "@/lib/acessoPortal";
import { EscolhaPerfil } from "@/components/clientes/EscolhaPerfil";
import { classeBotaoSecundario } from "@/lib/estilos";
import { diaMes, linkWhatsapp } from "@/lib/formatar";
import { useSession } from "@/hooks/useSession";
import { erro, mensagemDeErro, ok } from "@/lib/notify";

/**
 * Acesso ao portal: o dono convida pelo e-mail; a pessoa entra com o link de acesso
 * enviado para esse e-mail e fica ligada à empresa. Convite vale 30 dias.
 */
export function ClienteAcessoPortal({
  clienteId,
  emailSugerido,
  whatsapp,
  contato,
}: {
  clienteId: string;
  emailSugerido: string | null;
  whatsapp: string | null;
  contato: string | null;
}) {
  const { session } = useSession();
  const remetente =
    ((session?.user.user_metadata?.["full_name"] as string | undefined) ?? "").split(" ")[0] ?? "";
  const qc = useQueryClient();
  const chave = chavesAcessoPortal.doCliente(clienteId);
  const dados = useQuery({ queryKey: chave, queryFn: () => acessosDoPortal(clienteId) });
  const [email, setEmail] = useState(emailSugerido ?? "");
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<PerfilPortal>("equipe");
  const [podeAprovar, setPodeAprovar] = useState(true);
  // O primeiro acesso de uma empresa é de quem contratou (o banco também exige: CX-0).
  const semResponsavel =
    dados.data !== undefined &&
    !dados.data.pessoas.some((p) => p.perfil === "responsavel") &&
    !dados.data.convites.some((c) => c.perfil === "responsavel");
  const perfilDoConvite: PerfilPortal = semResponsavel ? "responsavel" : perfil;
  const falhou = (e: unknown) => mensagemDoAcesso(e) ?? mensagemDeErro(e);
  const recarregar = () => void qc.invalidateQueries({ queryKey: chave });

  const convidar = useMutation({
    mutationFn: (v: string) =>
      convidarParaPortal(
        clienteId,
        v,
        perfilDoConvite,
        perfilDoConvite === "responsavel" || podeAprovar,
      ),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: chave });
      const antes = qc.getQueryData<AcessosPortal>(chave);
      if (antes && !antes.convites.some((c) => c.email === v.toLowerCase()))
        qc.setQueryData<AcessosPortal>(chave, {
          ...antes,
          convites: [
            {
              id: `temp-${Date.now()}`,
              email: v.toLowerCase(),
              enviado_em: new Date().toISOString(),
              vale_ate: "",
              perfil: perfilDoConvite,
              pode_aprovar: perfilDoConvite === "responsavel" || podeAprovar,
            },
            ...antes.convites,
          ],
        });
      return { antes };
    },
    onSuccess: () => {
      ok("Convite registrado. Avise o cliente pelo WhatsApp no ícone ao lado do convite.");
      setEmail("");
    },
    onError: (e, v, ctx) => {
      if (ctx?.antes) qc.setQueryData(chave, ctx.antes);
      erro(falhou(e), { tentarDeNovo: () => convidar.mutate(v) });
    },
    onSettled: recarregar,
  });
  const cancelar = useMutation({
    mutationFn: cancelarConvite,
    onSuccess: () => ok("Convite cancelado."),
    onError: (e, v) => erro(falhou(e), { tentarDeNovo: () => cancelar.mutate(v) }),
    onSettled: recarregar,
  });
  // Troca de perfil com atualização otimista; o banco recusa deixar a empresa sem responsável.
  const trocar = useMutation({
    mutationFn: (v: { usuario: string; perfil: PerfilPortal }) =>
      mudarPerfil(clienteId, v.usuario, v.perfil, true),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: chave });
      const antes = qc.getQueryData<AcessosPortal>(chave);
      if (antes)
        qc.setQueryData<AcessosPortal>(chave, {
          ...antes,
          pessoas: antes.pessoas.map((p) =>
            p.user_id === v.usuario ? { ...p, perfil: v.perfil, pode_aprovar: true } : p,
          ),
        });
      return { antes };
    },
    onSuccess: (r) => ok(`Perfil alterado para ${nomeDoPerfil[r.perfil].toLowerCase()}.`),
    onError: (e, v, ctx) => {
      if (ctx?.antes) qc.setQueryData(chave, ctx.antes);
      erro(falhou(e), { tentarDeNovo: () => trocar.mutate(v) });
    },
    onSettled: recarregar,
  });
  const remover = useMutation({
    mutationFn: (u: string) => removerAcesso(clienteId, u),
    onSuccess: () => {
      ok("Acesso removido.");
      setConfirmar(null);
    },
    onError: (e, v) => erro(falhou(e), { tentarDeNovo: () => remover.mutate(v) }),
    onSettled: recarregar,
  });

  const endereco = typeof window !== "undefined" ? `${window.location.origin}/portal` : "/portal";
  const valido = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  return (
    <section
      aria-labelledby="portal-acesso-t"
      className="flex flex-col gap-4 rounded-2xl border border-hub-borda bg-white p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="portal-acesso-t" className="font-titulo text-lg font-bold">
          Acesso ao portal
        </h2>
        <p className="text-[14px] text-hub-suave">
          O cliente entra com o e-mail convidado e recebe um link de acesso, sem senha.
        </p>
      </div>

      {dados.isError ? (
        <p className="text-[14px] text-sit-risco-t">
          Não foi possível carregar os acessos.{" "}
          <button type="button" className="min-h-11 underline" onClick={() => void dados.refetch()}>
            Tentar de novo
          </button>
        </p>
      ) : dados.isPending ? (
        <div className="h-12 animate-pulse rounded-xl bg-hub-fundo" aria-busy="true" />
      ) : (
        <ul className="flex flex-col gap-2">
          {dados.data.pessoas.map((p) => (
            <li
              key={p.user_id}
              className="flex items-center gap-2 rounded-xl bg-sit-ok px-3 py-2 text-sit-ok-t"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-medium">
                  {p.nome ?? p.email}
                </span>
                <span className="text-[13px]">
                  Entra desde {diaMes(p.desde)}
                  {p.perfil === "equipe" && !p.pode_aprovar ? ". Não aprova entregas" : ""}
                </span>
              </span>
              <label className="sr-only" htmlFor={`perfil-${p.user_id}`}>
                Perfil de {p.nome ?? p.email}
              </label>
              <select
                id={`perfil-${p.user_id}`}
                value={p.perfil}
                onChange={(e) =>
                  trocar.mutate({ usuario: p.user_id, perfil: e.target.value as PerfilPortal })
                }
                className="h-11 rounded-lg border border-current/20 bg-white/70 px-2 text-[13.5px] font-medium text-hub-tinta"
              >
                <option value="responsavel">{nomeDoPerfil.responsavel}</option>
                <option value="equipe">{nomeDoPerfil.equipe}</option>
              </select>
              {confirmar === p.user_id ? (
                <button
                  type="button"
                  className="min-h-11 rounded-lg bg-[#9A1C12] px-3 text-[14px] font-semibold text-white"
                  onClick={() => remover.mutate(p.user_id)}
                >
                  Confirmar
                </button>
              ) : (
                <button
                  type="button"
                  className="min-h-11 rounded-lg px-3 text-[14px] font-medium underline"
                  onClick={() => setConfirmar(p.user_id)}
                >
                  Tirar acesso
                </button>
              )}
            </li>
          ))}
          {dados.data.convites.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded-xl bg-sit-info px-3 py-2 text-sit-info-t"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-medium">{c.email}</span>
                <span className="text-[13px]">
                  {nomeDoPerfil[c.perfil]}. Convidado em {diaMes(c.enviado_em)}
                  {c.vale_ate ? ` · vale até ${diaMes(c.vale_ate)}` : ""}
                </span>
              </span>
              {linkWhatsapp(whatsapp) && !c.id.startsWith("temp-") && (
                <a
                  href={`${linkWhatsapp(whatsapp)}?text=${encodeURIComponent(
                    [
                      `Oi${contato ? `, ${contato.split(" ")[0]}` : ""}! Aqui é ${remetente ? `o ${remetente}` : "a equipe"}, da Fora do Papel.`,
                      `Liberamos o seu acesso ao portal do projeto: ${endereco}`,
                      `Entre com o e-mail ${c.email}. Você recebe um link de acesso, sem senha.`,
                    ].join("\n"),
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Enviar convite de ${c.email} pelo WhatsApp`}
                  className="flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-white/60"
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                </a>
              )}
              <button
                type="button"
                disabled={c.id.startsWith("temp-")}
                aria-label={`Cancelar convite de ${c.email}`}
                className="flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-white/60 disabled:opacity-40"
                onClick={() => cancelar.mutate(c.id)}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
          {dados.data.pessoas.length === 0 && dados.data.convites.length === 0 && (
            <li className="text-[14px] text-hub-suave">
              Ninguém desta empresa entra no portal ainda.
            </li>
          )}
        </ul>
      )}

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (valido) convidar.mutate(email.trim());
        }}
      >
        <label htmlFor="convite-email" className="text-[14px] font-medium">
          Convidar pelo e-mail
        </label>
        <div className="flex gap-2">
          <input
            id="convite-email"
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="pessoa@empresa.com.br"
            className="h-11 min-w-0 flex-1 rounded-xl border border-[#DADAD3] px-3 text-base outline-none focus:border-hub-tinta md:text-[15px]"
          />
          <button type="submit" disabled={!valido} className={classeBotaoSecundario}>
            <Mail className="size-4" aria-hidden="true" /> Convidar
          </button>
        </div>
        {semResponsavel ? (
          <p className="rounded-xl bg-sit-atencao px-3 py-2 text-[13px] text-sit-atencao-t">
            O primeiro acesso é de quem contratou: entra como responsável pelo contrato. Depois você
            convida a equipe.
          </p>
        ) : (
          <EscolhaPerfil
            valor={perfil}
            aoMudar={setPerfil}
            podeAprovar={podeAprovar}
            aoMudarAprovar={setPodeAprovar}
          />
        )}
        <p className="rounded-xl bg-hub-fundo px-3 py-2 text-[13px] text-hub-suave">
          {perfilDoConvite === "equipe"
            ? "Vai ver 4 abas: Início, Aprovações, Pedidos e Arquivos. Pagamentos, valores e serviços adicionais ficam escondidos."
            : "Vai ver as 5 abas, inclusive Pagamentos, e poderá decidir serviços adicionais."}
        </p>
      </form>
      <button
        type="button"
        className="inline-flex min-h-11 items-center gap-2 self-start text-[14px] font-medium text-[#1E3FA8]"
        onClick={() => {
          void navigator.clipboard
            ?.writeText(endereco)
            .then(() => ok("Endereço do portal copiado."))
            .catch(() => erro("Não foi possível copiar. O endereço é " + endereco));
        }}
      >
        <Copy className="size-4" aria-hidden="true" /> Copiar endereço do portal
      </button>
    </section>
  );
}
