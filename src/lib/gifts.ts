export const OCCASIONS = [
  { id: "sint", name: "Sinterklaas", short: "Sint" },
  { id: "kerst", name: "Kerst", short: "Kerst" },
  { id: "verjaardag", name: "Verjaardag", short: "Verjaardag" },
  { id: "overig", name: "Overig", short: "Overig" },
] as const;

export type OccasionId = (typeof OCCASIONS)[number]["id"];

export type Gift = {
  id: string;
  name: string;
  recipient: string | null;
  occasion: OccasionId;
  price: number | null;
  link: string | null;
  note: string | null;
  bought: boolean;
  secret: boolean;
  addedBy: "vincent" | "marleen";
};

export const euro = (n: number) => `€${n.toFixed(2).replace(".", ",").replace(",00", ",-")}`;
