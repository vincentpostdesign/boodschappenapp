import type { PersonId } from "@/lib/types";

const NAMES: Record<PersonId, string> = { vincent: "Vincent", marleen: "Marleen" };

export function PersonDot({ person, size = "sm" }: { person: PersonId; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-5 w-5 text-[10px]" : "h-8 w-8 text-sm";
  const color = person === "vincent" ? "bg-vincent" : "bg-marleen";
  return (
    <span
      title={`Toegevoegd door ${NAMES[person]}`}
      className={`${dim} ${color} inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white`}
    >
      {NAMES[person][0]}
    </span>
  );
}
