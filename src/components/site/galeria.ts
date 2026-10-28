import { createContext, useContext } from "react";

/**
 * Nome da galeria de fotos onde a tela está: "aba Mídia" no Hub (CMS-2) e
 * "Fotos e arquivos" no painel do cliente (PC-3). Os componentes de artigo são os mesmos.
 */
export const GaleriaContexto = createContext<{ nome: string }>({ nome: "aba Mídia" });

export const useGaleria = () => useContext(GaleriaContexto);
