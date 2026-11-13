import Link from "next/link";
import { db } from "@/lib/db";
import { PEOPLE, requirePerson } from "@/lib/session";
import { longDate, todayNL } from "@/lib/dates";
import { getStores, getWeekSchedule } from "@/lib/data";
import { weekdayIndex } from "@/lib/schedule";
import { RefreshApp } from "@/components/beheer/RefreshApp";
import { ShopperPlanner } from "@/components/beheer/ShopperPlanner";
import { Notifications } from "@/components/beheer/Notifications";
import { ChangeCodeForm, SetCodeForForm } from "@/components/CodeForm";
import { codeStatus, signOutDevice } from "@/app/toegang-actions";
import { ProfilePhoto } from "@/components/beheer/ProfilePhoto";
import { IconChart, IconDown, IconEye, IconGift } from "@/components/icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Beheer · Boodschappen" };

export default async function BeheerPage() {
  const me = await requirePerson();
  const today = todayNL();
  const [schedule, stores, codes, giftCount] = await Promise.all([
    getWeekSchedule(),
    getStores(),
    codeStatus(),
    db().from("gifts").select("id", { count: "exact", head: true }).eq("bought", false).or(`secret.eq.false,added_by.eq.${me}`),
  ]);

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Beheer</h1>
        <RefreshApp />
      </div>

      <section id="wie" aria-labelledby="wie-kop" className="scroll-mt-4 space-y-2">
        <h2 id="wie-kop" className="px-1 text-xs font-bold uppercase tracking-wider text-muted">
          Wie doet de boodschappen · elke week
        </h2>
        <ShopperPlanner schedule={schedule} todayIndex={weekdayIndex(today)} todayLabel={longDate(today).replace(/^\S+\s/, "")} />
        <p className="px-1 text-xs text-muted">
          Dit rooster geldt elke week. Wie wordt ingeroosterd krijgt een melding, en op zijn dag om 8:00 een herinnering.
        </p>
      </section>

      <section aria-label="Onderdelen" className="space-y-2">
        <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-muted">Onderdelen</h2>
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          <NavRow
            href={`/beheer/route/${stores.find((s) => s.is_default)?.id ?? stores[0]?.id}`}
            Icon={IconDown}
            title="Looproute per winkel"
            sub="Volgorde van de afdelingen"
          />
          <NavRow
            href="/beheer/cadeaus"
            Icon={IconGift}
            title="Cadeaulijst"
            sub={`Sint, kerst en verjaardagen${giftCount.count ? ` · ${giftCount.count} nog te kopen` : ""}`}
          />
          <NavRow href="/watchlist" Icon={IconEye} title="Watchlist" sub="Aanbiedingen in de gaten houden" />
          <NavRow href="/dashboard" Icon={IconChart} title="Dashboard" sub="Wat kopen we, wat geven we uit" />
        </ul>
      </section>

      <section aria-label="Mijn profiel" className="space-y-2">
        <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-muted">Mijn profiel</h2>
        <ProfilePhoto me={me} name={PEOPLE[me].name} />
        <Notifications />
        <ChangeCodeForm />
        {(["vincent", "marleen"] as const)
          .filter((p) => !codes[p])
          .map((p) => (
            <SetCodeForForm key={p} person={p} name={PEOPLE[p].name} />
          ))}
        <form action={signOutDevice}>
          <button className="h-12 w-full rounded-2xl border border-line bg-surface text-[15px] font-medium text-danger">
            Deze telefoon afmelden
          </button>
        </form>
        {/* Tijdelijk: meten wat de iPhone doorgeeft over de statusbalk */}
        <a href="/beheer?scherm=test" className="block py-2 text-center text-sm text-muted underline">
          Schermtest (tijdelijk)
        </a>
      </section>
    </div>
  );
}

function NavRow({ href, Icon, title, sub }: { href: string; Icon: (p: { className?: string }) => React.ReactNode; title: string; sub: string }) {
  return (
    <li>
      <Link href={href} className="flex min-h-16 items-center gap-3 px-4 py-2">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{title}</span>
          <span className="block truncate text-sm text-muted">{sub}</span>
        </span>
        <span aria-hidden className="text-xl text-muted">›</span>
      </Link>
    </li>
  );
}
