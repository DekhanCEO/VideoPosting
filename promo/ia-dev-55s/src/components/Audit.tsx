import React, { useLayoutEffect } from "react";
import { continueRender, delayRender } from "remotion";
import { SAFE_BOTTOM, SAFE_TOP } from "../theme";

/**
 * Mode contrôle (composition « IaDev55Audit ») : à chaque image, mesure tous les textes visibles dans le DOM et
 * écrit le résultat dans la console du navigateur (récupéré par scripts/audit.mjs) :
 * position de chaque texte (zones de sécurité, débordement du cadre) et nombre de mots affichés.
 */
export const useAudit = (root: React.RefObject<HTMLDivElement | null>, frame: number, enabled: boolean) => {
  useLayoutEffect(() => {
    if (!enabled || !root.current) return;
    const handle = delayRender("audit");
    requestAnimationFrame(() => {
      const items: { text: string; x0: number; y0: number; x1: number; y1: number; opacity: number }[] = [];
      const walker = document.createTreeWalker(root.current!, NodeFilter.SHOW_TEXT);
      const rootRect = root.current!.getBoundingClientRect();
      const k = rootRect.width / 1080;
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = (n.textContent ?? "").trim();
        if (!text) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        const b = range.getBoundingClientRect();
        // rectangle visible : intersection avec les ancêtres qui rognent leur contenu (overflow hidden)
        let r = { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height };
        let opacity = 1;
        let hidden = false;
        for (let el: HTMLElement | null = n.parentElement; el && el !== root.current; el = el.parentElement) {
          const cs = getComputedStyle(el);
          opacity *= Number(cs.opacity);
          if (cs.visibility === "hidden" || cs.display === "none") hidden = true;
          if (cs.overflow !== "visible") {
            const c = el.getBoundingClientRect();
            const left = Math.max(r.left, c.left);
            const top = Math.max(r.top, c.top);
            const right = Math.min(r.right, c.right);
            const bottom = Math.min(r.bottom, c.bottom);
            r = { left, top, right, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
          }
        }
        if (hidden || opacity < 0.2) continue;
        if (r.width < 2 || r.height < 2) continue;
        items.push({
          text,
          x0: (r.left - rootRect.left) / k,
          y0: (r.top - rootRect.top) / k,
          x1: (r.right - rootRect.left) / k,
          y1: (r.bottom - rootRect.top) / k,
          opacity,
        });
      }
      console.log("AUDIT " + JSON.stringify({ frame, safeTop: SAFE_TOP, safeBottom: SAFE_BOTTOM, items }));
      continueRender(handle);
    });
  }, [enabled, frame, root]);
};
