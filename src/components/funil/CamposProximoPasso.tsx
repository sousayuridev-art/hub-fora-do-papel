import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProximoPasso } from "@/lib/funil";

/** Próximo passo + data + hora (opcional). Usado no novo contato, no mover e na edição. */
export function CamposProximoPasso({
  valor,
  aoMudar,
  prefixo,
  erroTexto,
}: {
  valor: ProximoPasso;
  aoMudar: (v: ProximoPasso) => void;
  prefixo: string;
  erroTexto?: string | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefixo}-passo`}>Próximo passo *</Label>
        <Input
          id={`${prefixo}-passo`}
          value={valor.texto}
          maxLength={200}
          onChange={(e) => aoMudar({ ...valor, texto: e.target.value })}
          placeholder="Ex.: Primeiro contato pelo WhatsApp"
          className="h-11"
          aria-invalid={Boolean(erroTexto)}
        />
        {erroTexto && <p className="text-[13px] text-sit-risco-t">{erroTexto}</p>}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${prefixo}-data`}>Data *</Label>
          <Input
            id={`${prefixo}-data`}
            type="date"
            value={valor.data}
            onChange={(e) => aoMudar({ ...valor, data: e.target.value })}
            className="h-11"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${prefixo}-hora`}>Hora</Label>
          <Input
            id={`${prefixo}-hora`}
            type="time"
            value={valor.hora}
            onChange={(e) => aoMudar({ ...valor, hora: e.target.value })}
            className="h-11 w-32"
          />
        </div>
      </div>
    </div>
  );
}
