import {
  CircleHelp,
  Image,
  LayoutTemplate,
  Megaphone,
  PanelBottom,
  type LucideIcon,
} from "lucide-react";

import type { TipoSecao } from "@/secoes/config";

export const iconeDaSecao: Record<TipoSecao, LucideIcon> = {
  Capa: LayoutTemplate,
  TextoImagem: Image,
  Perguntas: CircleHelp,
  Chamada: Megaphone,
  Rodape: PanelBottom,
};
