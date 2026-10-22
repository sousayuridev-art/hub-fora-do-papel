import { Link } from "@tanstack/react-router";
import { BadgeCheck, CircleMinus, SlidersHorizontal } from "lucide-react";

import { CampoNumero } from "@/components/hub/CampoNumero";
import { BlocoEditor } from "@/components/propostas/BlocoEditor";
import { CampoTexto } from "@/components/propostas/CampoTexto";
import { Opcoes } from "@/components/propostas/Opcoes";
import type { PropsBloco } from "@/components/propostas/tipos";
import { diaMes, moeda } from "@/lib/formatar";
import { rotuloDiagnostico } from "@/lib/funil";
import type { Calculo } from "@/lib/propostas";

/** "Como chegamos ao valor": complexidade, contingência, diagnóstico e desconto. */
export function BlocoValor({ d, alterar, bloqueado, c }: PropsBloco & { c: Calculo }) {
  return (
    <BlocoEditor
      id="valor"
      titulo="Como chegamos ao valor"
      texto={`Horas × ${moeda(c.hora_cents)} × complexidade, mais contingência, arredondado para cima a cada R$ 500.`}
      acao={
        // Antes era um botão no topo da tela (RD-5): o preço por hora e os planos moram em Configurações
        <Link
          to="/app/configuracoes"
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-1 text-[14px] font-medium text-sit-info-t hover:text-hub-tinta hover:underline"
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Preços
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Opcoes
            rotulo="Complexidade"
            bloqueado={bloqueado}
            valor={d.complexidade}
            aoEscolher={(v) => alterar({ complexidade: v })}
            opcoes={[
              { id: 1, rotulo: "Simples 1,0" },
              { id: 1.15, rotulo: "Média 1,15" },
              { id: 1.3, rotulo: "Alta 1,3" },
            ]}
          />
          <p className="text-[13px] text-hub-suave">Simples: parecido com o que já fizemos.</p>
        </div>
        <div className="flex flex-col gap-1">
          <Opcoes
            rotulo="Contingência"
            bloqueado={bloqueado}
            valor={d.contingencia}
            aoEscolher={(v) => alterar({ contingencia: v })}
            opcoes={[
              { id: 10, rotulo: "10%" },
              { id: 15, rotulo: "15%" },
              { id: 20, rotulo: "20%" },
            ]}
          />
          <p className="text-[13px] text-hub-suave">Reserva para o que aparece no caminho.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[14px] font-medium">Diagnóstico</span>
          {c.diagnostico ? (
            <p className="flex min-h-11 items-center gap-2 rounded-xl bg-sit-ok px-3 text-[14px] text-sit-ok-t">
              <BadgeCheck className="size-4 shrink-0" aria-hidden="true" />
              {rotuloDiagnostico[c.diagnostico.tipo]}, pago em {diaMes(c.diagnostico.pago_em)}: −{" "}
              {moeda(c.diagnostico.cents)}
            </p>
          ) : (
            <p className="flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-[#DADAD3] px-3 text-[14px] text-hub-suave">
              <CircleMinus className="size-4 shrink-0" aria-hidden="true" />
              Sem diagnóstico pago
            </p>
          )}
          <p className="text-[13px] text-hub-suave">
            Diagnóstico pago no prazo de Configurações sai do total sozinho.
          </p>
        </div>
        <CampoNumero
          bloqueado={bloqueado}
          rotulo="Desconto comercial"
          prefixo="R$"
          escala={100}
          casas={0}
          placeholder="0"
          valor={d.desconto_cents || null}
          aoMudar={(n) => alterar({ desconto_cents: Math.max(0, n ?? 0) })}
          ajuda={`Abaixo de ${moeda(c.piso_cents)} por hora, o envio pede um motivo.`}
        />
      </div>
      {(c.abaixo_do_piso || d.desconto_motivo) && (
        <CampoTexto
          rotulo="Motivo para ficar abaixo do piso"
          valor={d.desconto_motivo}
          max={400}
          linhas={2}
          bloqueado={bloqueado}
          placeholder="Ex.: cliente de indicação, entra como caso para o portfólio"
          ajuda="Pelo menos 15 letras. Fica registrado, o cliente não vê."
          aoMudar={(v) => alterar({ desconto_motivo: v })}
        />
      )}
    </BlocoEditor>
  );
}
