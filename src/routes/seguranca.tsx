import { useState, type FormEvent } from "react";
import { caminhoInterno } from "@/lib/volta";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Simbolo } from "@/components/layout/Marca";
import { TelaCarregando } from "@/components/feedback/TelaCarregando";
import { EstadoErro } from "@/components/hub/EstadoErro";
import { carregarAcesso, inicioDoPapel } from "@/lib/acesso";
import { diaMes } from "@/lib/formatar";
import { erro, ok } from "@/lib/notify";
import {
  appsAtivos,
  chavesSeguranca,
  confirmarApp,
  definirSenha,
  forcaDaSenha,
  iniciarApp,
  mensagemDeSeguranca,
  nivelDaSessao,
  removerApp,
  SENHA_MINIMA,
  type AppAutenticador,
  type NovoApp,
} from "@/lib/seguranca";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const busca = z.object({
  volta: caminhoInterno,
  ativar: z.boolean().optional().catch(undefined),
  acao: z.enum(["senha"]).optional().catch(undefined),
});

export const Route = createFileRoute("/seguranca")({
  ssr: false,
  validateSearch: busca,
  beforeLoad: async ({ context, location, search }) => {
    const { session, acesso } = await carregarAcesso(context.queryClient);
    if (!session)
      throw redirect({ to: "/entrar", search: { volta: location.href, modo: "equipe" } });
    if (acesso?.papel !== "owner")
      throw redirect({ to: acesso?.papel ? inicioDoPapel[acesso.papel] : "/sem-acesso" });
    // Com app ativado, mexer na segurança exige o código desta sessão.
    const n = await nivelDaSessao().catch(() => null);
    if (!n) throw redirect({ to: "/entrar", search: { modo: "equipe" } });
    if (n.proximo === "aal2" && n.atual !== "aal2") {
      throw redirect({ to: "/entrar/codigo", search: { volta: location.href } });
    }
    return { email: session.user.email ?? "", volta: search.volta };
  },
  pendingComponent: () => <TelaCarregando />,
  head: () => ({ meta: [{ title: "Segurança da conta · Hub Fora do Papel" }] }),
  component: Seguranca,
});

/** Senha e app autenticador do gestor (card SEG-1). */
function Seguranca() {
  const { volta, acao } = Route.useSearch();
  const navigate = useNavigate();
  const { email } = Route.useRouteContext();
  const apps = useQuery({ queryKey: chavesSeguranca.apps, queryFn: appsAtivos });
  const semApp = apps.data?.length === 0;

  return (
    <div className="min-h-dvh bg-hub-fundo px-4 py-8 text-hub-tinta md:py-12">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <Simbolo tamanho={32} />
          {!semApp && apps.isSuccess && (
            <button
              type="button"
              onClick={() => void navigate({ href: volta ?? "/app" })}
              className="min-h-11 text-[15px] font-medium underline underline-offset-4"
            >
              Ir para o Hub
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-bold tracking-[-0.02em]">Segurança da conta</h1>
          <p className="text-[15px] text-hub-suave">
            {email} entra com senha e com o código de um app autenticador no celular.
          </p>
        </div>
        {semApp && (
          <p
            role="status"
            className="rounded-2xl bg-sit-atencao p-4 text-[15px] text-sit-atencao-t"
          >
            Para proteger os dados dos clientes, ative o app autenticador antes de continuar no Hub.
          </p>
        )}
        <SecaoApp apps={apps} volta={volta} />
        <SecaoSenha destaque={acao === "senha"} />
        <button
          type="button"
          onClick={() =>
            void supabase.auth.signOut().then(() => window.location.assign("/entrar?modo=equipe"))
          }
          className="min-h-11 self-start text-[14px] text-hub-suave underline underline-offset-4"
        >
          Sair
        </button>
      </div>
    </div>
  );
}

function SecaoApp({
  apps,
  volta,
}: {
  apps: UseQueryResult<AppAutenticador[]>;
  volta: string | undefined;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [novo, setNovo] = useState<NovoApp | null>(null);
  const [codigo, setCodigo] = useState("");

  const iniciar = useMutation({
    mutationFn: () => iniciarApp("Celular"),
    onSuccess: (n) => {
      setNovo(n);
      setCodigo("");
    },
    onError: (e) => erro(mensagemDeSeguranca(e)),
  });
  const confirmar = useMutation({
    mutationFn: () => confirmarApp(novo?.id ?? "", codigo),
    onSuccess: () => {
      const primeiro = apps.data?.length === 0;
      setNovo(null);
      // Primeiro app ativado vindo de uma tela do Hub: volta para ela já com a sessão verificada.
      if (primeiro && volta) void navigate({ href: volta, replace: true });
      ok("App autenticador ativado. A partir de agora o Hub pede o código ao entrar.");
      void qc.invalidateQueries({ queryKey: chavesSeguranca.apps });
    },
    onError: (e) => {
      setCodigo("");
      erro(mensagemDeSeguranca(e));
    },
  });
  const remover = useMutation({
    mutationFn: (id: string) => removerApp(id),
    onSuccess: () => ok("App removido."),
    onError: (e) => erro(mensagemDeSeguranca(e)),
    onSettled: () => void qc.invalidateQueries({ queryKey: chavesSeguranca.apps }),
  });

  return (
    <section
      aria-labelledby="app-t"
      className="flex flex-col gap-4 rounded-2xl border border-hub-borda bg-white p-5 md:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sit-ok text-sit-ok-t">
          <Smartphone className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 id="app-t" className="text-[18px] font-semibold">
            App autenticador
          </h2>
          <p className="text-[14.5px] text-hub-suave">
            Google Authenticator, Microsoft Authenticator ou 1Password. Ative em dois aparelhos para
            ter uma reserva se perder o celular.
          </p>
        </div>
      </div>

      {apps.isPending ? (
        <div className="h-16 animate-pulse rounded-xl bg-hub-fundo" aria-busy="true" />
      ) : apps.isError ? (
        <EstadoErro
          titulo="Não foi possível ver os apps ativados"
          aoTentarDeNovo={() => void apps.refetch()}
        />
      ) : (
        apps.data.length > 0 && (
          <ul className="flex flex-col">
            {apps.data.map((a) => (
              <li
                key={a.id}
                className="flex min-h-14 items-center gap-3 border-t border-hub-borda py-2"
              >
                <ShieldCheck className="size-5 text-[#145A37]" aria-hidden="true" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <b className="truncate text-[15px] font-semibold">{a.nome.split(" · ")[0]}</b>
                  <span className="text-[13px] text-hub-suave">
                    Ativado em {diaMes(a.criadoEm)}
                  </span>
                </span>
                {apps.data.length > 1 && (
                  <button
                    type="button"
                    disabled={remover.isPending}
                    onClick={() => remover.mutate(a.id)}
                    className="min-h-11 px-2 text-[14px] text-hub-suave underline underline-offset-4 hover:text-hub-tinta"
                  >
                    Remover
                  </button>
                )}
              </li>
            ))}
          </ul>
        )
      )}

      {novo ? (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (/^\d{6}$/.test(codigo)) confirmar.mutate();
          }}
          className="flex flex-col gap-4 rounded-xl bg-hub-fundo p-4 md:flex-row md:items-start"
        >
          <img
            src={novo.qr}
            alt="QR code para ativar o app autenticador"
            className="size-44 shrink-0 self-center rounded-lg bg-white p-2"
          />
          <div className="flex min-w-0 flex-col gap-3">
            <ol className="list-decimal pl-5 text-[14.5px] leading-relaxed">
              <li>No app, toque em adicionar e aponte a câmera para o QR code.</li>
              <li>
                Sem câmera? Digite a chave:{" "}
                <code className="break-all rounded bg-white px-1.5 py-0.5 text-[13px]">
                  {novo.segredo}
                </code>
              </li>
              <li>Digite abaixo o código de 6 dígitos que aparecer.</li>
            </ol>
            <div className="flex flex-col gap-2">
              <Label htmlFor="codigo-novo">Código do app</Label>
              <Input
                id="codigo-novo"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-12 max-w-48 bg-white text-center text-[20px] tracking-[0.3em]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                className="h-11"
                disabled={codigo.length !== 6 || confirmar.isPending}
              >
                {confirmar.isPending ? "Conferindo…" : "Ativar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => setNovo(null)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          className={cn(
            "h-11 self-start",
            apps.data?.length === 0 && "bg-[#FFB020] text-hub-tinta hover:bg-[#F5A50F]",
          )}
          variant={apps.data?.length === 0 ? "default" : "outline"}
          disabled={iniciar.isPending || apps.isPending}
          onClick={() => iniciar.mutate()}
        >
          {apps.data?.length === 0 ? "Ativar app autenticador" : "Ativar em outro aparelho"}
        </Button>
      )}
    </section>
  );
}

function SecaoSenha({ destaque }: { destaque: boolean }) {
  const [senha, setSenha] = useState("");
  const [repetir, setRepetir] = useState("");
  const forca = forcaDaSenha(senha);
  const confere = senha.length > 0 && senha === repetir;
  const valida = forca.nivel >= 2 && confere;

  const salvar = useMutation({
    mutationFn: () => definirSenha(senha),
    onSuccess: () => {
      setSenha("");
      setRepetir("");
      ok("Senha salva. Use-a na próxima entrada, junto com o código do app.");
    },
    onError: (e) => erro(mensagemDeSeguranca(e)),
  });

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (valida) salvar.mutate();
      }}
      aria-labelledby="senha-t"
      className={cn(
        "flex flex-col gap-4 rounded-2xl border bg-white p-5 md:p-6",
        destaque ? "border-hub-tinta" : "border-hub-borda",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sit-info text-sit-info-t">
          <KeyRound className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 id="senha-t" className="text-[18px] font-semibold">
            {destaque ? "Criar nova senha" : "Criar ou trocar a senha"}
          </h2>
          <p className="text-[14.5px] text-hub-suave">
            Pelo menos {SENHA_MINIMA} caracteres. Uma frase com números funciona bem.
          </p>
        </div>
      </div>
      {/* Campo de usuário oculto ajuda o gerenciador de senhas a salvar no lugar certo. */}
      <input type="text" name="username" autoComplete="username" value="" readOnly hidden />
      <div className="flex flex-col gap-2">
        <Label htmlFor="nova-senha">Nova senha</Label>
        <Input
          id="nova-senha"
          type="password"
          autoComplete="new-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          aria-describedby="forca"
          className="h-12 bg-white text-base"
        />
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
          type="password"
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
      <Button
        type="submit"
        variant="outline"
        className="h-11 self-start"
        disabled={!valida || salvar.isPending}
      >
        {salvar.isPending ? "Salvando…" : "Salvar senha"}
      </Button>
      <p className="text-[13px] text-hub-suave">
        Esqueceu a senha? Na tela de entrada, use "Esqueci a senha": o link chega no e-mail e pede o
        código do app.{" "}
        <Link to="/entrar" search={{ modo: "equipe" }} className="underline">
          Ir para a entrada
        </Link>
      </p>
    </form>
  );
}
