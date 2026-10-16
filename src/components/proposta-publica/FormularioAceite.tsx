import { useId, useState, type InputHTMLAttributes } from "react";

import { classeAcaoPrincipal, classeBotaoSecundario } from "@/lib/estilos";
import type { DadosAceite } from "@/lib/propostas";
import { cn } from "@/lib/utils";

function Campo({
  rotulo,
  ajuda,
  ...props
}: { rotulo: string; ajuda?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[14px] font-medium">
        {rotulo}
      </label>
      <input
        id={id}
        {...props}
        className="h-12 rounded-xl border border-[#DADAD3] bg-white px-3.5 text-base outline-none focus:border-hub-tinta focus:ring-2 focus:ring-hub-tinta/10"
      />
      {ajuda && <p className="text-[13px] text-hub-suave">{ajuda}</p>}
    </div>
  );
}

/** Dados do contrato + "Li e concordo" + aceitar; "Não vou seguir agora" com motivo opcional. */
export function FormularioAceite({
  nomeInicial,
  empresa,
  previa,
  enviando,
  aoAceitar,
  aoRecusar,
}: {
  nomeInicial: string;
  empresa: string;
  previa: boolean;
  enviando: boolean;
  aoAceitar: (d: DadosAceite) => void;
  aoRecusar: (motivo: string) => void;
}) {
  const [d, setD] = useState<DadosAceite>({
    nome: nomeInicial,
    email: "",
    documento: "",
    razaoSocial: empresa,
    endereco: "",
    emailCobranca: "",
    responsavel: "",
    concordo: false,
  });
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const mudar = (campos: Partial<DadosAceite>) => setD((a) => ({ ...a, ...campos }));

  if (recusando) {
    return (
      <div className="flex flex-col gap-3">
        <label htmlFor="motivo-recusa" className="text-[15px] font-medium">
          Pode contar o que pesou? (opcional)
        </label>
        <textarea
          id="motivo-recusa"
          rows={3}
          maxLength={600}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="rounded-xl border border-[#DADAD3] px-3.5 py-3 text-base outline-none focus:border-hub-tinta"
        />
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={previa || enviando}
            onClick={() => aoRecusar(motivo)}
            className={cn(classeBotaoSecundario, "h-12 w-full")}
          >
            Confirmar: não vou seguir agora
          </button>
          <button
            type="button"
            onClick={() => setRecusando(false)}
            className="min-h-12 text-[15px] font-medium text-[#1E3FA8]"
          >
            Voltar ao aceite
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!previa) aoAceitar(d);
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Campo
          rotulo="Seu nome completo"
          required
          autoComplete="name"
          value={d.nome}
          onChange={(e) => mudar({ nome: e.target.value })}
        />
        <Campo
          rotulo="Seu e-mail"
          required
          type="email"
          autoComplete="email"
          inputMode="email"
          value={d.email}
          onChange={(e) => mudar({ email: e.target.value })}
        />
        <Campo
          rotulo="CPF ou CNPJ"
          required
          inputMode="numeric"
          autoComplete="off"
          value={d.documento}
          onChange={(e) => mudar({ documento: e.target.value })}
          ajuda="Do responsável pelo contrato: CNPJ da empresa ou o seu CPF."
        />
        <Campo
          rotulo="Razão social ou nome completo"
          required
          autoComplete="organization"
          value={d.razaoSocial}
          onChange={(e) => mudar({ razaoSocial: e.target.value })}
        />
        <div className="md:col-span-2">
          <Campo
            rotulo="Endereço completo"
            required
            autoComplete="street-address"
            value={d.endereco}
            onChange={(e) => mudar({ endereco: e.target.value })}
            placeholder="Rua, número, bairro, cidade e estado"
          />
        </div>
        <Campo
          rotulo="E-mail para cobranças (opcional)"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={d.emailCobranca}
          onChange={(e) => mudar({ emailCobranca: e.target.value })}
          ajuda="Se ficar em branco, usamos o seu e-mail."
        />
        <Campo
          rotulo="Responsável legal (opcional)"
          autoComplete="name"
          value={d.responsavel}
          onChange={(e) => mudar({ responsavel: e.target.value })}
          ajuda="Se for outra pessoa que assina pela empresa."
        />
      </div>
      <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl bg-hub-fundo p-4 text-[15px]">
        <input
          type="checkbox"
          required
          checked={d.concordo}
          onChange={(e) => mudar({ concordo: e.target.checked })}
          className="mt-0.5 size-5 shrink-0 accent-[#0E1013]"
        />
        Li e concordo com esta proposta, com o que não está incluído e com as condições de
        pagamento.
      </label>
      <p className="text-[13px] text-hub-suave">
        Usamos estes dados só para o contrato e a cobrança deste projeto. Junto com o aceite
        guardamos a data, o navegador e o endereço de internet, como comprovante.
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={previa || enviando}
          className={cn(classeAcaoPrincipal, "h-12 w-full sm:w-full disabled:opacity-60")}
        >
          {previa
            ? "Aceitar proposta (prévia: desativado)"
            : enviando
              ? "Registrando o aceite…"
              : "Aceitar proposta"}
        </button>
        <button
          type="button"
          onClick={() => setRecusando(true)}
          className={cn(classeBotaoSecundario, "h-12 w-full")}
        >
          Não vou seguir agora
        </button>
      </div>
    </form>
  );
}
