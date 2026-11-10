"use client";

import type { PersonId } from "@/lib/types";
import { useAvatarUrl } from "./Avatars";

const NAMES: Record<PersonId, string> = { vincent: "Vincent", marleen: "Marleen" };
const SIZES = { sm: "h-5 w-5 text-[10px]", md: "h-8 w-8 text-sm", lg: "h-24 w-24 text-3xl" };

/** Profielfoto of, zonder foto, de initiaal in de eigen kleur. */
export function PersonDot({ person, size = "sm", title }: { person: PersonId; size?: keyof typeof SIZES; title?: string }) {
  const url = useAvatarUrl(person);
  const dim = SIZES[size];
  const label = title ?? `Toegevoegd door ${NAMES[person]}`;
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={label} title={label} className={`${dim} shrink-0 rounded-full object-cover`} />;
  }
  const color = person === "vincent" ? "bg-vincent" : "bg-marleen";
  return (
    <span title={label} className={`${dim} ${color} inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white`}>
      {NAMES[person][0]}
    </span>
  );
}
