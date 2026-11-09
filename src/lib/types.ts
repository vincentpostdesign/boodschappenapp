export type PersonId = "vincent" | "marleen";

export type Person = { id: PersonId; name: string; initial: string };

export type Store = { id: string; name: string; is_default: boolean; sort_order: number; location: string | null };

export type Department = { id: string; store_id: string; name: string; sort_order: number };

export type Product = {
  id: string;
  name: string;
  description: string | null;
  default_quantity: number;
  default_store_id: string | null;
  hidden: boolean;
};

export type ListItem = {
  id: string;
  product_id: string | null;
  name: string;
  description: string | null;
  quantity: number;
  added_by: PersonId;
  added_at: string;
  checked: boolean;
  checked_at: string | null;
  checked_by: PersonId | null;
};

export type CheaperElsewhere = { storeName: string; difference: number };
