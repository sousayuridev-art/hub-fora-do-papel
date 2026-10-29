import { useState, type FormEvent } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Simbolo } from "@/components/layout/Marca";
import { TelaCarregando } from "@/components/feedback/TelaCarregando";
import { carregarAcesso, inicioDoPapel } from "@/lib/acesso";
import { erro, ok } from "@/lib/notify";
import { entrarComSenha, enviarLinkRecuperacao, mensagemDeSeguranca } from "@/lib/seguranca";
import { caminhoInterno } from "@/lib/volta";

/** Entrada do gestor (card SEG-1): endereço próprio, separado da entrada dos clientes. */
export const Route = createFileRoute("/gestor")({
  ssr: false,
  validateSearch: z.object({ volta: caminhoInterno }),
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
      { title: "Área do gestor · Fora do Papel" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Gestor,
});

const emailValido = z.string().trim().email();

/** Gestor: e-mail e senha; o código do app vem na tela seguinte. */
function Gestor() {
  const { volta } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [falha, setFalha] = useState<string | null>(null);

  const entrar = useMutation({
    mutationFn: () => entrarComSenha(email.trim(), senha),
    onSuccess: () => void navigate({ href: volta ?? "/app", replace: true }),
    onError: (e) => setFalha(mensagemDeSeguranca(e)),
  });
  const recuperar = useMutation({
    mutationFn: () => enviarLinkRecuperacao(email.trim()),
    onSuccess: () =>
      ok("Se o e-mail for de um gestor, o link para criar nova senha chega em instantes."),
    // Mesma resposta com ou sem conta, para não revelar quais e-mails existem.
    onError: (e) =>
      /rate limit|too many/i.test(e.message)
        ? erro(mensagemDeSeguranca(e))
        : ok("Se o e-mail for de um gestor, o link para criar nova senha chega em instantes."),
  });
  const emailOk = emailValido.safeParse(email).success;

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setFalha(null);
    if (emailOk && senha.length > 0) entrar.mutate();
  }

  return (
    <div className="capa-escura flex min-h-dvh items-center justify-center px-4 py-10">
      <form
        onSubmit={aoEnviar}
        className="flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-[#F5F5F2] p-7 text-hub-tinta shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)] md:p-8"
      >
        <Simbolo tamanho={32} />
        <div className="flex flex-col gap-1">
          <h1 className="font-marca text-[28px] font-extrabold leading-tight tracking-[-0.03em]">
            Área do gestor
          </h1>
          <p className="text-[15px] text-hub-suave">
            E-mail e senha. Depois, o código de 6 dígitos do seu app autenticador.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email-equipe">E-mail</Label>
          <Input
            id="email-equipe"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 bg-white text-base"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="senha">Senha</Label>
          <Input
            id="senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            aria-invalid={falha !== null}
            aria-describedby={falha ? "senha-erro" : undefined}
            className="h-12 bg-white text-base"
          />
          {falha && (
            <p id="senha-erro" role="alert" className="text-[13px] text-[#9A1C12]">
              {falha}
            </p>
          )}
        </div>
        <Button
          type="submit"
          className="h-12 w-full text-[15px]"
          disabled={entrar.isPending || !emailOk || !senha}
        >
          {entrar.isPending ? "Entrando…" : "Entrar"}
        </Button>
        <button
          type="button"
          disabled={!emailOk || recuperar.isPending}
          onClick={() => recuperar.mutate()}
          className="min-h-11 self-start rounded-lg bg-sit-neutro px-3 text-sm font-medium text-hub-tinta hover:bg-[#E6E6DF] disabled:opacity-50"
        >
          Esqueci a senha
        </button>
      </form>
    </div>
  );
}
