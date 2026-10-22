import { useState, type FormEvent } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Simbolo } from "@/components/layout/Marca";
import { TelaCarregando } from "@/components/feedback/TelaCarregando";
import { supabase } from "@/lib/supabase";
import { mensagemDeSeguranca, nivelDaSessao, verificarCodigo } from "@/lib/seguranca";

const busca = z.object({
  volta: z
    .string()
    .regex(/^\/(?![/\\])/, "caminho interno")
    .optional()
    .catch(undefined),
});

export const Route = createFileRoute("/entrar_/codigo")({
  ssr: false,
  validateSearch: busca,
  // Só faz sentido com sessão aberta e app ativado sem o código ainda.
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/entrar", search: { volta: search.volta } });
    const n = await nivelDaSessao().catch(() => null);
    if (n?.atual === "aal2") throw redirect({ href: search.volta ?? "/app" });
    if (n?.proximo !== "aal2")
      throw redirect({ to: "/seguranca", search: { volta: search.volta, ativar: true } });
  },
  pendingComponent: () => <TelaCarregando />,
  head: () => ({ meta: [{ title: "Código de acesso · Fora do Papel" }] }),
  component: Codigo,
});

/** Segunda etapa do login do gestor (card SEG-1): código de 6 dígitos do app autenticador. */
function Codigo() {
  const { volta } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [codigo, setCodigo] = useState("");
  const [falha, setFalha] = useState<string | null>(null);

  const verificar = useMutation({
    mutationFn: () => verificarCodigo(codigo),
    onSuccess: () => void navigate({ href: volta ?? "/app", replace: true }),
    onError: (e) => {
      setFalha(mensagemDeSeguranca(e));
      setCodigo("");
    },
  });

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setFalha(null);
    if (/^\d{6}$/.test(codigo)) verificar.mutate();
  }

  async function sair() {
    await supabase.auth.signOut();
    await navigate({ to: "/entrar", search: { modo: "equipe" }, replace: true });
  }

  return (
    <div className="capa-escura flex min-h-dvh items-center justify-center px-4 py-10">
      <form
        onSubmit={aoEnviar}
        className="flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-[#F5F5F2] p-7 text-hub-tinta shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)] md:p-8"
      >
        <Simbolo tamanho={32} />
        <div className="flex flex-col gap-1">
          <ShieldCheck className="size-6 text-[#145A37]" aria-hidden="true" />
          <h1 className="font-marca text-[28px] font-extrabold leading-tight tracking-[-0.03em]">
            Código do app
          </h1>
          <p className="text-[15px] text-hub-suave">
            Abra o app autenticador no celular e digite o código de 6 dígitos da Fora do Papel.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="codigo">Código</Label>
          <Input
            id="codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            autoFocus
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
            aria-invalid={falha !== null}
            aria-describedby={falha ? "codigo-erro" : undefined}
            className="h-14 bg-white text-center text-[24px] tracking-[0.4em]"
          />
          {falha && (
            <p id="codigo-erro" role="alert" className="text-[13px] text-[#9A1C12]">
              {falha}
            </p>
          )}
        </div>
        <Button
          type="submit"
          className="h-12 w-full text-[15px]"
          disabled={verificar.isPending || codigo.length !== 6}
        >
          {verificar.isPending ? "Conferindo…" : "Confirmar"}
        </Button>
        <button
          type="button"
          onClick={() => void sair()}
          className="min-h-11 self-start text-sm font-medium text-[#3A3F47] underline underline-offset-4"
        >
          Sair e entrar com outra conta
        </button>
      </form>
    </div>
  );
}
