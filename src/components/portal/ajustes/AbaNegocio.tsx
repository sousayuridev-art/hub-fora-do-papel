import { useState } from "react";

import { CampoTexto } from "@/components/hub/Campo";
import { HorarioEditor } from "@/components/portal/ajustes/HorarioEditor";
import { horarioPadrao, problemaDoNegocio, type Negocio } from "@/lib/ajustesSite";
import { telefoneLegivel } from "@/lib/contatosSite";

/** Seu negócio: nome, WhatsApp, endereço, Instagram e horário. Um lugar só para o site inteiro. */
export function AbaNegocio({
  inicial,
  salvando,
  aoSalvar,
}: {
  inicial: Negocio;
  salvando: boolean;
  aoSalvar: (n: Negocio) => void;
}) {
  const [n, setN] = useState<Negocio>(() => ({
    ...inicial,
    whatsapp: inicial.whatsapp ? telefoneLegivel(inicial.whatsapp) : "",
    instagram: inicial.instagram ? `@${inicial.instagram}` : "",
    horario: inicial.horario?.length ? inicial.horario : horarioPadrao,
  }));
  const [aviso, setAviso] = useState<string | null>(null);

  function salvar() {
    const problema = problemaDoNegocio(n);
    setAviso(problema);
    if (!problema) aoSalvar(n);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <CampoTexto
        rotulo="Nome do negócio"
        valor={n.nome ?? ""}
        aoMudar={(v) => setN({ ...n, nome: v })}
        maxLength={100}
        autoComplete="organization"
      />
      <CampoTexto
        rotulo="WhatsApp"
        valor={n.whatsapp ?? ""}
        aoMudar={(v) => setN({ ...n, whatsapp: v })}
        maxLength={20}
        inputMode="numeric"
        autoComplete="tel"
        placeholder="(79) 99999-0000"
        ajuda="Usado em todos os botões de WhatsApp do site."
      />
      <CampoTexto
        rotulo="Endereço"
        valor={n.endereco ?? ""}
        aoMudar={(v) => setN({ ...n, endereco: v })}
        maxLength={200}
        autoComplete="street-address"
      />
      <CampoTexto
        rotulo="Instagram"
        valor={n.instagram ?? ""}
        aoMudar={(v) => setN({ ...n, instagram: v })}
        maxLength={31}
        autoComplete="off"
        placeholder="@seunegocio"
      />
      <HorarioEditor valor={n.horario ?? []} aoMudar={(h) => setN({ ...n, horario: h })} />
      {aviso && (
        <p role="alert" className="rounded-xl bg-sit-risco p-3 text-[14px] text-sit-risco-t">
          {aviso}
        </p>
      )}
      <button
        type="button"
        onClick={salvar}
        disabled={salvando}
        className="botao-degrade inline-flex h-12 items-center justify-center self-start rounded-xl px-6 text-[15px] font-semibold text-hub-tinta disabled:opacity-60 max-sm:w-full"
      >
        {salvando ? "Salvando…" : "Salvar e publicar"}
      </button>
    </div>
  );
}
