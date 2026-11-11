"use client";

import { useEffect } from "react";

/**
 * iPhone (app op beginscherm): nadat het toetsenbord sluit, blijven vaste balken (menu onderin,
 * vlak achter de statusbalk) soms op de plek staan waar het toetsenbord eindigde.
 * Een minieme scroll dwingt Safari om ze opnieuw op de juiste plek te tekenen.
 */
export function ViewportFix() {
  useEffect(() => {
    const vv = window.visualViewport;
    let timers: ReturnType<typeof setTimeout>[] = [];

    const nudge = () => {
      const y = window.scrollY;
      window.scrollTo(window.scrollX, y + 1);
      requestAnimationFrame(() => window.scrollTo(window.scrollX, y));
    };
    // Toetsenbord animeert dicht: een paar keer kort na elkaar herstellen.
    const afterKeyboard = () => {
      timers.forEach(clearTimeout);
      timers = [60, 250, 500].map((ms) => setTimeout(nudge, ms));
    };
    const isTyping = (el: Element | null) =>
      !!el && (el.tagName === "TEXTAREA" || el.tagName === "SELECT" || (el.tagName === "INPUT" && !["checkbox", "radio", "button", "submit", "file"].includes((el as HTMLInputElement).type)));

    const onFocusOut = () => {
      // Springt de focus naar een ander veld, dan blijft het toetsenbord open: niets doen.
      setTimeout(() => {
        if (!isTyping(document.activeElement)) afterKeyboard();
      }, 0);
    };
    let lastHeight = vv?.height ?? 0;
    const onResize = () => {
      if (!vv) return;
      if (vv.height > lastHeight + 80) afterKeyboard(); // toetsenbord ging dicht
      lastHeight = vv.height;
    };
    const onVisible = () => document.visibilityState === "visible" && afterKeyboard();

    document.addEventListener("focusout", onFocusOut);
    vv?.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", afterKeyboard);
    return () => {
      timers.forEach(clearTimeout);
      document.removeEventListener("focusout", onFocusOut);
      vv?.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", afterKeyboard);
    };
  }, []);

  return null;
}
