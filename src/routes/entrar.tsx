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
import { previaDoLink } from "@/lib/enderecoPublico";

const buscaEntrar = z.object({
  volta: z
    .string()
    .regex(/^\/(?![/\\])/, "caminho interno")
    .optional()
    .catch(undefined),
  /** E-mail já preenchido (vem do "Abrir meu portal" depois do aceite: CX-4). */
  email: z.string().trim().email().max(160).optional().catch(undefined),
});

export const Route = createFileRoute("/entrar")({
  ssr: false,
  validateSearch: buscaEntrar,
  // Quem já está logado não vê o formulário: vai direto para a sua área.
  beforeLoad: async ({ context, search }) => {
    const { session, acesso } = await carregarAcesso(context.queryClient);
    if (!session || !acesso) return;
    if (acesso.papel && search.volta) throw redirect({ href: search.volta });
    throw redirect({ to: acesso.papel ? inicioDoPapel[acesso.papel] : "/sem-acesso" });
  },
  pendingComponent: () => <TelaCarregando />,
  head: () => ({
    meta: [
      { title: "Entrar · Fora do Papel" },
      ...previaDoLink(
        "Seu portal do projeto",
        "Acompanhe o projeto, aprove cada entrega e fale com o responsável. Fora do Papel.",
        "portal",
      ),
    ],
  }),
  component: Entrar,
});

const emailValido = z.string().trim().email();

/** Login só com e-mail: o Supabase envia um link mágico. */
function Entrar() {
  const { volta, email: sugerido } = Route.useSearch();
  const [email, setEmail] = useState(sugerido ?? "");
  // Quem vem para o portal vê o texto do cliente (CX-4); o Yuri vê o de sempre.
  const doPortal = (volta ?? "").startsWith("/portal");
  const [invalido, setInvalido] = useState(false);

  const enviarLink = useMutation({
    mutationFn: async (endereco: string) => {
      const retorno = new URL("/auth/callback", window.location.origin);
      // Sempre com "?": o modelo de e-mail do Supabase acrescenta "&token_hash=…&type=email".
      retorno.searchParams.set("volta", volta ?? "/");
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
    <div className="capa-escura flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-[#F5F5F2] p-7 text-hub-tinta shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)] md:p-8">
        <Simbolo tamanho={32} />
        {enviarLink.isSuccess ? (
          <div className="mt-5 flex flex-col gap-2" role="status">
            <MailCheck className="size-6 text-[#145A37]" aria-hidden="true" />
            <h1 className="font-marca text-[28px] font-extrabold tracking-[-0.03em]">
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
              <h1 className="font-marca text-[28px] font-extrabold leading-tight tracking-[-0.03em]">
                {doPortal ? "Entrar no seu portal" : "Entrar"}
              </h1>
              <p className="text-[15px] text-hub-suave">
                {doPortal
                  ? "Aqui você acompanha o projeto, aprova cada entrega e faz pedidos de ajuste. Sem senha: o link de acesso chega no seu e-mail."
                  : "Sem senha: enviamos um link de acesso para o seu e-mail."}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus={!sugerido}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={invalido}
                aria-describedby={invalido ? "email-erro" : undefined}
                className="h-12 bg-white text-base"
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
              {enviarLink.isPending
                ? "Enviando…"
                : doPortal
                  ? "Receber meu link de acesso"
                  : "Enviar link de acesso"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
