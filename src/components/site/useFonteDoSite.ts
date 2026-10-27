import { useEffect } from "react";

import { linkGeist } from "@/components/layout/FonteCliente";

/** A Geist (fonte do site) só é pedida quando uma prévia do site abre (CMS-2 e CMS-4). */
export function useFonteDoSite() {
  useEffect(() => {
    if (document.querySelector(`link[href="${linkGeist.href}"]`)) return;
    const l = document.createElement("link");
    l.rel = linkGeist.rel;
    l.href = linkGeist.href;
    document.head.appendChild(l);
  }, []);
}
