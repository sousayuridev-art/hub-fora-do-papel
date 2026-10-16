import { isoDoDia } from "@/lib/formatar";
import type { Oportunidade, ProximoPasso } from "@/lib/funil";

/** Próximo passo atual de uma oportunidade, no formato dos campos. */
export function passoDe(o: Oportunidade | null): ProximoPasso {
  return {
    texto: o?.next_step ?? "",
    data: o?.next_step_date ?? isoDoDia(new Date()),
    hora:
      o?.next_step_has_time && o.next_step_at
        ? new Date(o.next_step_at).toTimeString().slice(0, 5)
        : "",
  };
}
