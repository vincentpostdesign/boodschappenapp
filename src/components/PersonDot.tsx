"use client";

import type { PersonId } from "@/lib/types";
import { useHasAvatar } from "./Avatars";

const NAMES: Record<PersonId, string> = { vincent: "Vincent", marleen: "Marleen" };
const SIZES = { sm: "h-5 w-5 text-[10px]", md: "h-8 w-8 text-sm", lg: "h-24 w-24 text-3xl" };

/** Profielfoto of, zonder foto, de initiaal in de eigen kleur. */
export function PersonDot({ person, size = "sm", title }: { person: PersonId; size?: keyof typeof SIZES; title?: string }) {
  const hasPhoto = useHasAvatar(person);
  const dim = SIZES[size];
  const label = title ?? `Toegevoegd door ${NAMES[person]}`;
  if (hasPhoto) {
    return <span role="img" aria-label={label} title={label} className={`${dim} avatar-${person} inline-block shrink-0 rounded-full bg-cover bg-center`} />;
  }
  const color = person === "vincent" ? "bg-vincent" : "bg-marleen";
  return (
    <span title={label} className={`${dim} ${color} inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white`}>
      {NAMES[person][0]}
    </span>
  );
}
