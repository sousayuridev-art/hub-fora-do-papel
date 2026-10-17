import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Mail, MessageCircle, X } from "lucide-react";

import {
  acessosDoPortal,
  cancelarConvite,
  chavesAcessoPortal,
  convidarParaPortal,
  mensagemDoAcesso,
  removerAcesso,
  type AcessosPortal,
} from "@/lib/acessoPortal";
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
  const falhou = (e: unknown) => mensagemDoAcesso(e) ?? mensagemDeErro(e);
  const recarregar = () => void qc.invalidateQueries({ queryKey: chave });

  const convidar = useMutation({
    mutationFn: (v: string) => convidarParaPortal(clienteId, v),
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
                <span className="block truncate text-[14.5px] font-medium">{p.email}</span>
                <span className="text-[13px]">Entra desde {diaMes(p.desde)}</span>
              </span>
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
                  Convidado em {diaMes(c.enviado_em)}
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
