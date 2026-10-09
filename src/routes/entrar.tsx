import { useState, type FormEvent } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { MailCheck } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Simbolo } from "@/components/layout/Marca";
import { TelaCarregando } from "@/components/feedback/TelaCarregando";
import { carregarAcesso, inicioDoPapel } from "@/lib/acesso";
import { supabase } from "@/lib/supabase";
import { erro, mensagemDeErro } from "@/lib/notify";

const buscaEntrar = z.object({ volta: z.string().startsWith("/").optional().catch(undefined) });

export const Route = createFileRoute("/entrar")({
  ssr: false,
  validateSearch: buscaEntrar,
  // Quem já está logado não vê o formulário: vai direto para a sua área.
  beforeLoad: async ({ context, search }) => {
    const { session, acesso } = await carregarAcesso(context.queryClient);
    if (!session || !acesso) return;
    throw redirect({
      to: acesso.papel ? (search.volta ?? inicioDoPapel[acesso.papel]) : "/sem-acesso",
    });
  },
  pendingComponent: () => <TelaCarregando />,
  head: () => ({ meta: [{ title: "Entrar · Hub Fora do Papel" }] }),
  component: Entrar,
});

const emailValido = z.string().trim().email();

/** Login só com e-mail: o Supabase envia um link mágico. */
function Entrar() {
  const { volta } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [invalido, setInvalido] = useState(false);

  const enviarLink = useMutation({
    mutationFn: async (endereco: string) => {
      const retorno = new URL("/auth/callback", window.location.origin);
      if (volta) retorno.searchParams.set("volta", volta);
      const { error } = await supabase.auth.signInWithOtp({
        email: endereco,
        options: { emailRedirectTo: retorno.toString(), shouldCreateUser: true },
      });
      if (error) throw error;
    },
    onError: (e, endereco) =>
      erro(mensagemDeErro(e), { tentarDeNovo: () => enviarLink.mutate(endereco) }),
  });

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    const resultado = emailValido.safeParse(email);
    setInvalido(!resultado.success);
    if (resultado.success) enviarLink.mutate(resultado.data);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-hub-fundo px-4">
      <div className="w-full max-w-sm rounded-2xl border border-hub-borda bg-white p-7 shadow-sm md:p-8">
        <Simbolo tamanho={32} />
        {enviarLink.isSuccess ? (
          <div className="mt-5 flex flex-col gap-2" role="status">
            <MailCheck className="size-6 text-[#145A37]" aria-hidden="true" />
            <h1 className="font-titulo text-2xl font-semibold tracking-tight">
              Confira seu e-mail
            </h1>
            <p className="text-[15px] leading-relaxed text-hub-suave">
              Enviamos um link de acesso para{" "}
              <strong className="text-hub-tinta">{enviarLink.variables}</strong>. Ele vale por 1
              hora. Pode fechar esta aba.
            </p>
            <button
              type="button"
              onClick={() => enviarLink.reset()}
              className="mt-2 min-h-11 self-start text-sm font-medium text-[#3A3F47] underline underline-offset-4"
            >
              Usar outro e-mail
            </button>
          </div>
        ) : (
          <form onSubmit={aoEnviar} noValidate className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="font-titulo text-2xl font-semibold tracking-tight">Entrar</h1>
              <p className="text-[15px] text-hub-suave">
                Sem senha: enviamos um link de acesso para o seu e-mail.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={invalido}
                aria-describedby={invalido ? "email-erro" : undefined}
                className="h-12 text-base"
                placeholder="voce@empresa.com.br"
              />
              {invalido && (
                <p id="email-erro" className="text-[13px] text-[#9A1C12]">
                  Confira o e-mail digitado.
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="h-12 w-full text-[15px]"
              disabled={enviarLink.isPending}
            >
              {enviarLink.isPending ? "Enviando…" : "Enviar link de acesso"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
