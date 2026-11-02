import { useState, type FormEvent } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Simbolo } from "@/components/layout/Marca";
import { TelaCarregando } from "@/components/feedback/TelaCarregando";
import { FonteCliente, linkGeist } from "@/components/layout/FonteCliente";
import { supabase } from "@/lib/supabase";
import {
  SENHA_MINIMA,
  definirSenha,
  forcaDaSenha,
  mensagemDeSeguranca,
  nivelDaSessao,
} from "@/lib/seguranca";
import { cn } from "@/lib/utils";

const busca = z.object({
  /** "primeiro": link gerado no Hub; "nova": link do e-mail (criar ou trocar a senha). */
  tipo: z.enum(["primeiro", "nova"]).optional().catch(undefined),
});

export const Route = createFileRoute("/entrar_/senha")({
  ssr: false,
  validateSearch: busca,
  // Só com a sessão aberta pelo link. Conta com app autenticador (gestor) troca a senha na
  // tela de segurança, depois do código (SEG-1): o link do e-mail sozinho não basta.
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/entrar" });
    // Sem o nível da sessão, não decide às cegas: o erro aparece (a troca exige saber se há app de código)
    const n = await nivelDaSessao();
    if (n.proximo === "aal2" || n.atual === "aal2")
      throw redirect({ href: "/seguranca?acao=senha" });
    return { email: data.session.user.email ?? "" };
  },
  pendingComponent: () => (
    <FonteCliente>
      <TelaCarregando />
    </FonteCliente>
  ),
  head: () => ({
    meta: [{ title: "Crie sua senha · Fora do Papel" }, { name: "robots", content: "noindex" }],
    links: [linkGeist],
  }),
  component: () => (
    <FonteCliente>
      <CriarSenha />
    </FonteCliente>
  ),
});

/** Tela "Crie sua senha" do cliente (card SEG-2). Depois de salvar, abre o portal. */
function CriarSenha() {
  const { tipo } = Route.useSearch();
  const { email } = Route.useRouteContext();
  const navigate = Route.useNavigate();
  const [senha, setSenha] = useState("");
  const [repetir, setRepetir] = useState("");
  const [ver, setVer] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const forca = forcaDaSenha(senha);
  const confere = senha.length > 0 && senha === repetir;
  const valida = forca.nivel >= 2 && confere;

  const salvar = useMutation({
    mutationFn: () => definirSenha(senha),
    onSuccess: () => void navigate({ href: "/portal", replace: true }),
    onError: (e) => setFalha(mensagemDeSeguranca(e)),
  });

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setFalha(null);
    if (valida && !salvar.isPending) salvar.mutate();
  }

  return (
    <div className="capa-escura flex min-h-dvh items-center justify-center px-4 py-10">
      <form
        onSubmit={aoEnviar}
        noValidate
        className="flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-[#F5F5F2] p-7 text-hub-tinta shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)] md:p-8"
      >
        <Simbolo tamanho={32} />
        <div className="flex flex-col gap-1">
          <KeyRound className="size-6 text-[#145A37]" aria-hidden="true" />
          <h1 className="font-marca text-[28px] font-extrabold leading-tight tracking-[-0.03em]">
            {tipo === "nova" ? "Crie uma senha nova" : "Crie sua senha"}
          </h1>
          <p className="text-[15px] text-hub-suave">
            Daqui em diante, você entra no portal com{" "}
            {email ? <strong>{email}</strong> : "seu e-mail"} e esta senha. Use pelo menos{" "}
            {SENHA_MINIMA} caracteres; uma frase com números funciona bem.
          </p>
        </div>
        {/* Usuário oculto: o gerenciador de senhas do celular salva no e-mail certo. */}
        <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />
        <div className="flex flex-col gap-2">
          <Label htmlFor="nova-senha">Senha</Label>
          <div className="relative">
            <Input
              id="nova-senha"
              type={ver ? "text" : "password"}
              autoComplete="new-password"
              autoFocus
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              aria-describedby="forca"
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
          <div className="flex items-center gap-2" id="forca" aria-live="polite">
            <span className="flex h-1.5 w-32 gap-1" aria-hidden="true">
              {[1, 2, 3].map((n) => (
                <i
                  key={n}
                  className={cn(
                    "h-full flex-1 rounded-full",
                    forca.nivel >= n
                      ? forca.nivel === 1
                        ? "bg-[#9A1C12]"
                        : forca.nivel === 2
                          ? "bg-[#D48A00]"
                          : "bg-[#145A37]"
                      : "bg-[#E4E4DE]",
                  )}
                />
              ))}
            </span>
            <span className="text-[13px] text-hub-suave">{senha ? forca.texto : " "}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="repetir-senha">Repita a senha</Label>
          <Input
            id="repetir-senha"
            type={ver ? "text" : "password"}
            autoComplete="new-password"
            value={repetir}
            onChange={(e) => setRepetir(e.target.value)}
            aria-invalid={repetir.length > 0 && !confere}
            className="h-12 bg-white text-base"
          />
          {repetir.length > 0 && !confere && (
            <p className="text-[13px] text-[#9A1C12]">As senhas não são iguais.</p>
          )}
        </div>
        {falha && (
          <p role="alert" className="rounded-xl bg-[#FDE8E6] px-3 py-2 text-[14px] text-[#9A1C12]">
            {falha}
          </p>
        )}
        <Button
          type="submit"
          className="h-12 w-full text-[15px]"
          disabled={!valida || salvar.isPending}
        >
          {salvar.isPending ? "Salvando…" : "Salvar e abrir o portal"}
        </Button>
      </form>
    </div>
  );
}
