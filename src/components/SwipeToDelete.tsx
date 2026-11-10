"use client";

import { useEffect, useRef, useState } from "react";
import { IconTrash } from "./icons";

const ACTION_W = 96; // breedte van de rode knop
const DECIDE = 8; // pixels voordat we weten of het horizontaal of verticaal is

/**
 * Veeg naar links: rode "Verwijderen" komt tevoorschijn. Ver doorvegen verwijdert direct.
 * Verticaal scrollen blijft werken (touch-action: pan-y). Eén regel tegelijk open.
 */
export function SwipeToDelete({
  open,
  onOpenChange,
  onDelete,
  label,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  label: string;
  children: React.ReactNode;
}) {
  const row = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState(false);
  const g = useRef<{ x: number; y: number; start: number; dir: "h" | "v" | null; id: number } | null>(null);
  const swallowClick = useRef(false);

  // Sluit als een andere regel opengaat
  useEffect(() => {
    if (!open && !g.current) setOffset(0);
  }, [open]);

  const width = () => row.current?.offsetWidth ?? 320;

  const remove = () => {
    setRemoving(true);
    setOffset(-width());
    setTimeout(onDelete, 180);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    g.current = { x: e.clientX, y: e.clientY, start: open ? -ACTION_W : offset, dir: null, id: e.pointerId };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = g.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.dir) {
      if (Math.abs(dx) > DECIDE && Math.abs(dx) > Math.abs(dy)) {
        s.dir = "h";
        setDragging(true);
        row.current?.setPointerCapture(s.id);
      } else if (Math.abs(dy) > DECIDE) {
        s.dir = "v";
        return;
      } else return;
    }
    if (s.dir !== "h") return;
    setOffset(Math.min(0, Math.max(-width(), s.start + dx)));
  };

  const onPointerUp = () => {
    const s = g.current;
    g.current = null;
    if (!s || s.dir !== "h") return;
    setDragging(false);
    swallowClick.current = true; // de klik na een veeg niet doorgeven aan knoppen
    if (offset < -width() * 0.6) return remove();
    if (offset < -ACTION_W / 2) {
      setOffset(-ACTION_W);
      onOpenChange(true);
    } else {
      setOffset(0);
      onOpenChange(false);
    }
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (swallowClick.current) {
      swallowClick.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (open) {
      // tik op een open regel: eerst dichtdoen
      e.preventDefault();
      e.stopPropagation();
      setOffset(0);
      onOpenChange(false);
    }
  };

  const shown = open && !dragging && !removing ? -ACTION_W : offset;

  return (
    <div className={`relative overflow-hidden ${removing ? "pointer-events-none" : ""}`}>
      {/* Rode achtergrond met de knop */}
      <div className="absolute inset-y-0 right-0 flex bg-danger" style={{ width: Math.max(ACTION_W, -shown) }} aria-hidden={!open}>
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          onClick={remove}
          className="ml-auto flex h-full flex-col items-center justify-center gap-1 text-xs font-semibold text-white"
          style={{ width: ACTION_W }}
        >
          <IconTrash className="h-6 w-6" />
          Verwijderen
        </button>
      </div>
      <div
        ref={row}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
        aria-label={open ? `${label}: veeg terug of tik om te sluiten` : undefined}
        className={`relative touch-pan-y bg-surface ${dragging ? "" : "transition-transform duration-200 ease-out"}`}
        style={{ transform: `translateX(${shown}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
