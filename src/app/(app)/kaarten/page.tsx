import { requirePerson } from "@/lib/session";
import { getStores } from "@/lib/data";
import { getCards } from "@/lib/cards";
import { BackLink } from "@/components/BackLink";
import { LoyaltyCards, type CardView } from "@/components/LoyaltyCards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Klantenkaarten · Boodschappen" };

export default async function KaartenPage() {
  await requirePerson();
  const [cards, stores] = await Promise.all([getCards(), getStores()]);
  const names = Object.fromEntries(stores.map((s) => [s.id, s.name]));
  // In de volgorde die jullie zelf kiezen (omhoog/omlaag op de pas)
  const view: CardView[] = cards.map((c) => ({ ...c, storeName: names[c.store] ?? c.store.replace(/^anders:/, "") }));

  return (
    <div className="space-y-4">
      <BackLink href="/" label="Lijst" />
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Klantenkaarten</h1>
        <p className="text-sm text-muted">Laat de barcode scannen bij de kassa. Werkt ook zonder internet.</p>
      </header>
      <LoyaltyCards cards={view} stores={stores.map((s) => ({ id: s.id, name: s.name }))} openId={null} />
    </div>
  );
}
