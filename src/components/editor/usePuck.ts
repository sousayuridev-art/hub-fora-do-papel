import { createUsePuck } from "@puckeditor/core";

import type { ConfigSecoes } from "@/secoes/config";

/** Hook do Puck com seletor: re-renderiza só quando a parte escolhida muda. */
export const usePuck = createUsePuck<ConfigSecoes>();
