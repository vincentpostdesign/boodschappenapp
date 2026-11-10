"use client";

import { useEffect, useState } from "react";
import { IconUp } from "./icons";

/** Knop "naar boven": verschijnt na een stuk scrollen. Op telefoon boven de menubalk. */
export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <button
      type="button"
      aria-label="Naar boven"
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      className="fixed right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-lg bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6 md:right-6"
    >
      <IconUp className="h-6 w-6" />
    </button>
  );
}
