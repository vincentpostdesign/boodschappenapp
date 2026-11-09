// Eén interface voor prijsbronnen, zodat PrijsProfeet later vervangen kan worden.

export type Offer = {
  source: string;
  externalId: string;
  storeId: string; // onze winkel-id (aldi, jumbo, plus, ah, lidl)
  name: string;
  brand: string | null;
  category: string | null; // categorie van de bron, bijv. 'zuivel-eieren'
  quantity: string | null;
  price: number | null;
  originalPrice: number | null;
  discountPct: number | null;
  promoLabel: string | null;
  validFrom: string | null;
  validUntil: string | null;
  status: "active" | "upcoming";
  url: string | null;
  imageUrl: string | null;
};

export interface PriceSource {
  readonly id: string;
  /** Alle lopende en komende acties van één winkel. */
  promotions(storeId: string): Promise<Offer[]>;
  /** Zoeken (voor het toevoegen van een watchlist-product). */
  search(query: string, limit?: number): Promise<Offer[]>;
}
