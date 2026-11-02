import { useState, type FormEvent } from "react";
import { caminhoInterno } from "@/lib/volta";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Simbolo } from "@/components/layout/Marca";
import { TelaCarregando } from "@/components/feedback/TelaCarregando";
import { FonteCliente, linkGeist } from "@/components/layout/FonteCliente";
import { carregarAcesso, inicioDoPapel } from "@/lib/acesso";
import { erro, mensagemDeErro } from "@/lib/notify";
import { entrarComSenha, enviarLinkDeSenha, mensagemDeSeguranca } from "@/lib/seguranca";
import { previaDoLink } from "@/lib/enderecoPublico";

const buscaEntrar = z.object({
  volta: caminhoInterno,
  /** E-mail já preenchido (vem do "Abrir meu portal" depois do aceite: CX-4). */
  email: z.string().trim().email().max(160).optional().catch(undefined),
  /** Endereço antigo da entrada do gestor ("?modo=equipe"): leva para /gestor. */
  modo: z.enum(["cliente", "equipe"]).optional().catch(undefined),
});

export const Route = createFileRoute("/entrar")({
  ssr: false,
  validateSearch: buscaEntrar,
  // Quem já está logado não vê o formulário: vai direto para a sua área.
  beforeLoad: async ({ context, search }) => {
    if (search.modo === "equipe")
      throw redirect({ to: "/gestor", search: { volta: search.volta } });
    const { session, acesso } = await carregarAcesso(context.queryClient);
    if (!session || !acesso) return;
    if (acesso.papel && search.volta) throw redirect({ href: search.volta });
    throw redirect({ to: acesso.papel ? inicioDoPapel[acesso.papel] : "/sem-acesso" });
  },
  pendingComponent: () => (
    <FonteCliente>
      <TelaCarregando />
    </FonteCliente>
  ),
  head: () => ({
    meta: [
      { title: "Entrar · Fora do Papel" },
      ...previaDoLink(
        "Seu portal do projeto",
        "Acompanhe o projeto, aprove cada entrega e fale com o responsável. Fora do Papel.",
        "portal",
      ),
    ],
    // Entrada do cliente: mesmas fontes do portal (RD-10). A do gestor (/gestor) segue no Hub.
    links: [linkGeist],
  }),
  component: () => (
    <FonteCliente>
      <Entrar />
    </FonteCliente>
  ),
});

const emailValido = z.string().trim().email();

/** Entrada dos clientes: e-mail e senha (card SEG-2). O gestor entra por /gestor (SEG-1). */
function Entrar() {
  const { volta, email: sugerido } = Route.useSearch();
  const [modo, setModo] = useState<"senha" | "link">("senha");
  const [email, setEmail] = useState(sugerido ?? "");
  return (
    <div className="capa-escura flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-[#F5F5F2] p-7 text-hub-tinta shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)] md:p-8">
        <Simbolo tamanho={32} />
        {modo === "senha" ? (
          <FormSenha
            volta={volta}
            email={email}
            aoMudarEmail={setEmail}
            focoNaSenha={Boolean(sugerido)}
            aoPedirLink={() => setModo("link")}
          />
        ) : (
          <FormLink email={email} aoMudarEmail={setEmail} aoVoltar={() => setModo("senha")} />
        )}
      </div>
    </div>
  );
}

function CampoEmail({
  valor,
  aoMudar,
  invalido,
  autoFocus,
}: {
  valor: string;
  aoMudar: (v: string) => void;
  invalido: boolean;
  autoFocus: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="email">E-mail</Label>
      <Input
        id="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoFocus={autoFocus}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
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
  );
}

/** E-mail e senha. Erro de login fica na tela (não em toast): a pessoa corrige ali mesmo. */
function FormSenha({
  volta,
  email,
  aoMudarEmail,
  focoNaSenha,
  aoPedirLink,
}: {
  volta: string | undefined;
  email: string;
  aoMudarEmail: (v: string) => void;
  focoNaSenha: boolean;
  aoPedirLink: () => void;
}) {
  const navigate = Route.useNavigate();
  const [senha, setSenha] = useState("");
  const [ver, setVer] = useState(false);
  const [invalido, setInvalido] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);

  const entrar = useMutation({
    mutationFn: (v: { email: string; senha: string }) => entrarComSenha(v.email, v.senha),
    onSuccess: () => void navigate({ href: volta ?? "/portal", replace: true }),
    onError: (e) => setFalha(mensagemDeSeguranca(e)),
  });

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setFalha(null);
    const resultado = emailValido.safeParse(email);
    setInvalido(!resultado.success);
    if (resultado.success && senha) entrar.mutate({ email: resultado.data, senha });
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="mt-5 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-marca text-[28px] font-extrabold leading-tight tracking-[-0.03em]">
          Entrar no seu portal
        </h1>
        <p className="text-[15px] text-hub-suave">
          Aqui você acompanha o projeto, aprova cada entrega e faz pedidos de ajuste.
        </p>
      </div>
      <CampoEmail
        valor={email}
        aoMudar={aoMudarEmail}
        invalido={invalido}
        autoFocus={!focoNaSenha}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor="senha">Senha</Label>
        <div className="relative">
          <Input
            id="senha"
            type={ver ? "text" : "password"}
            autoComplete="current-password"
            autoFocus={focoNaSenha}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="h-12 bg-white pr-12 text-base"
          />
          <button
            type="button"
            onClick={() => setVer((v) => !v)}
            aria-label={ver ? "Esconder a senha" : "Mostrar a senha"}
            aria-pressed={ver}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-hub-suave"
          >
            {ver ? (
              <EyeOff className="size-5" aria-hidden="true" />
            ) : (
              <Eye className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      {falha && (
        <p role="alert" className="rounded-xl bg-[#FDE8E6] px-3 py-2 text-[14px] text-[#9A1C12]">
          {falha}
        </p>
      )}
      <Button
        type="submit"
        className="h-12 w-full text-[15px]"
        disabled={entrar.isPending || !senha}
      >
        {entrar.isPending ? "Entrando…" : "Entrar"}
      </Button>
      <button
        type="button"
        onClick={aoPedirLink}
        className="min-h-11 self-start text-sm font-medium text-[#3A3F47] underline underline-offset-4"
      >
        Primeiro acesso ou esqueceu a senha?
      </button>
    </form>
  );
}

/** Criar ou trocar a senha: link no e-mail, que leva à tela "Crie sua senha". */
function FormLink({
  email,
  aoMudarEmail,
  aoVoltar,
}: {
  email: string;
  aoMudarEmail: (v: string) => void;
  aoVoltar: () => void;
}) {
  const [invalido, setInvalido] = useState(false);
  const enviar = useMutation({
    mutationFn: enviarLinkDeSenha,
    onError: (e, endereco) =>
      erro(mensagemDeErro(e), { tentarDeNovo: () => enviar.mutate(endereco) }),
  });

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    const resultado = emailValido.safeParse(email);
    setInvalido(!resultado.success);
    if (resultado.success) enviar.mutate(resultado.data);
  }

  if (enviar.isSuccess)
    return (
      <div className="mt-5 flex flex-col gap-2" role="status">
        <MailCheck className="size-6 text-[#145A37]" aria-hidden="true" />
        <h1 className="font-marca text-[28px] font-extrabold tracking-[-0.03em]">
          Confira seu e-mail
        </h1>
        <p className="text-[15px] leading-relaxed text-hub-suave">
          Enviamos um link para <strong className="text-hub-tinta">{enviar.variables}</strong>. Abra
          o link para criar sua senha. Ele vale por 1 hora e uma vez só.
        </p>
        <button
          type="button"
          onClick={aoVoltar}
          className="mt-2 min-h-11 self-start text-sm font-medium text-[#3A3F47] underline underline-offset-4"
        >
          Voltar para a entrada
        </button>
      </div>
    );

  return (
    <form onSubmit={aoEnviar} noValidate className="mt-5 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-marca text-[28px] font-extrabold leading-tight tracking-[-0.03em]">
          Criar ou trocar a senha
        </h1>
        <p className="text-[15px] text-hub-suave">
          Digite o e-mail que você usa no portal. Enviamos um link para você criar uma senha nova.
        </p>
      </div>
      <CampoEmail valor={email} aoMudar={aoMudarEmail} invalido={invalido} autoFocus />
      <Button type="submit" className="h-12 w-full text-[15px]" disabled={enviar.isPending}>
        {enviar.isPending ? "Enviando…" : "Receber o link no e-mail"}
      </Button>
      <button
        type="button"
        onClick={aoVoltar}
        className="min-h-11 self-start text-sm font-medium text-[#3A3F47] underline underline-offset-4"
      >
        Voltar para a entrada
      </button>
    </form>
  );
}
