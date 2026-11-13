"use client";

import { useEffect, useState } from "react";

/**
 * Tijdelijk meetscherm (alleen met ?scherm=test in de adresbalk, of na 5× tikken op het lijst-icoon is niet nodig):
 * laat zien wat de iPhone doorgeeft over de statusbalk, zodat het vlak achter de klok goed kan worden ingesteld.
 */
export function ScreenProbe() {
  const [info, setInfo] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    if (!new URLSearchParams(location.search).has("scherm")) return;
    const measure = () => {
      const probe = document.createElement("div");
      probe.style.cssText = "position:fixed;top:0;left:0;height:env(safe-area-inset-top);width:1px;padding-bottom:env(safe-area-inset-bottom)";
      document.body.appendChild(probe);
      const cover = document.querySelector<HTMLElement>("[data-statusvlak]");
      const r = cover?.getBoundingClientRect();
      const vv = window.visualViewport;
      setInfo({
        "env top": `${probe.getBoundingClientRect().height}px`,
        "env onder": `${parseFloat(getComputedStyle(probe).paddingBottom)}px`,
        "vlak top/hoogte": r ? `${Math.round(r.top)} / ${Math.round(r.height)}px` : "niet gevonden",
        innerHeight: `${innerHeight}`,
        "scherm (screen)": `${screen.width}×${screen.height}`,
        "visualViewport": vv ? `top ${Math.round(vv.offsetTop)}, h ${Math.round(vv.height)}` : "-",
        scrollY: `${Math.round(scrollY)}`,
        standalone: `${matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true}`,
      });
      probe.remove();
    };
    measure();
    addEventListener("scroll", measure, { passive: true });
    return () => removeEventListener("scroll", measure);
  }, []);
  if (!info) return null;
  return (
    <div className="fixed inset-x-4 top-1/3 z-[70] rounded-2xl bg-ink/90 p-4 font-mono text-[13px] leading-6 text-white shadow-xl">
      {Object.entries(info).map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3">
          <span className="opacity-70">{k}</span>
          <span>{v}</span>
        </div>
      ))}
    </div>
  );
}
