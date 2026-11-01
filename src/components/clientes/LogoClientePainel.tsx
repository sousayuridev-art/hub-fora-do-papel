import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageUp, Loader2 } from "lucide-react";

import { PainelLateral } from "@/components/hub/PainelLateral";
import { Sigla } from "@/components/hub/Selo";
import { enviarLogo, problemaNaLogo, tirarLogo } from "@/lib/clientes";
import { chavesClientes } from "@/lib/funil";
import { classeAcaoTexto, classeBotaoSecundario } from "@/lib/estilos";
import { sigla } from "@/lib/formatar";
import { erro, mensagemDeErro, ok } from "@/lib/notify";

/**
 * Logo do cliente (RD2-5): PNG, JPG ou WEBP até 1 MB. Aparece na lista e na página do cliente.
 * Sem logo, fica a sigla.
 */
export function LogoClientePainel({
  clienteId,
  empresa,
  logoAtual,
  aberto,
  aoMudar,
}: {
  clienteId: string;
  empresa: string;
  logoAtual: string | undefined;
  aberto: boolean;
  aoMudar: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const entrada = useRef<HTMLInputElement>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const atualizar = () => void qc.invalidateQueries({ queryKey: chavesClientes.tudo });

  const enviar = useMutation({
    mutationFn: (f: File) => enviarLogo(clienteId, f),
    onSuccess: () => {
      atualizar();
      ok("Logo salva.");
      aoMudar(false);
    },
    onError: (e) => erro(`Não foi possível salvar a logo. ${mensagemDeErro(e)}`),
  });
  const tirar = useMutation({
    mutationFn: () => tirarLogo(clienteId),
    onSuccess: () => {
      atualizar();
      ok("Logo removida. Fica a sigla.");
      aoMudar(false);
    },
    onError: (e) => erro(`Não foi possível tirar a logo. ${mensagemDeErro(e)}`),
  });
  const ocupado = enviar.isPending || tirar.isPending;

  return (
    <PainelLateral
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Logo do cliente"
      descricao="Aparece na lista de clientes e na página do cliente. PNG, JPG ou WEBP até 1 MB."
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <span className="[&>*]:size-16 [&>*]:rounded-xl [&>*]:text-[18px]">
            <Sigla texto={sigla(empresa)} logo={logoAtual} />
          </span>
          <span className="text-[14px] text-hub-suave">
            {logoAtual ? "Logo atual" : "Sem logo: aparece a sigla"}
          </span>
        </div>
        <input
          ref={entrada}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-label="Escolher imagem da logo"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const p = problemaNaLogo(f);
            setAviso(p);
            if (!p) enviar.mutate(f);
          }}
        />
        <button
          type="button"
          disabled={ocupado}
          onClick={() => entrada.current?.click()}
          className={`${classeBotaoSecundario} w-full`}
        >
          {enviar.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ImageUp className="size-4" aria-hidden="true" />
          )}
          {logoAtual ? "Trocar a imagem" : "Escolher imagem"}
        </button>
        {aviso && (
          <p role="alert" className="text-[14px] text-sit-risco-t">
            {aviso}
          </p>
        )}
        {logoAtual && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => tirar.mutate()}
            className={`${classeAcaoTexto} self-start`}
          >
            Tirar a logo
          </button>
        )}
      </div>
    </PainelLateral>
  );
}
