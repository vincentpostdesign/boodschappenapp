# Boodschappen

Gezamenlijke boodschappenlijst van Vincent en Marleen. Mobile-first webapp (PWA): Next.js 15 (App Router, TypeScript), Tailwind 4, Supabase (Postgres + Storage), later Vercel.

## Wat zit erin

| Scherm | Functie |
|---|---|
| **Lijst** (`/`) | Producten in de looproute van de gekozen winkel, per afdeling. Afvinken, aantal, wie/wanneer, sectie Gehaald, icoon *goedkoper elders*. |
| **Vast** (`/vast`) | Vaste producten met één tik op de lijst, *Zet alle erop*, zoeken. |
| **Watchlist** (`/watchlist`) | Producten volgen op aanbiedingen (merk, prijsgrens, minimale korting). Foto van voorkant en streepjescode (Claude leest verpakking en EAN), optioneel de officiële afbeelding uit Open Food Facts. |
| **Cadeaulijst** (`/beheer/cadeaus`) | Cadeau-ideeën voor Sint, kerst en verjaardagen; per ontvanger, met prijs/link, afvinken als gekocht, optioneel geheim voor de ander. |
| **Bonnen** (`/bonnen`) | Bon fotograferen → foto meteen bewaard → Claude leest regels uit (gewone schrijfwijze) → controleren en opslaan, regels op de boodschappenlijst zetten. Leert bonnamen en Aldi-prijzen. Verwijderen met WISSEN. |
| **Dashboard** (`/dashboard`) | Uitgaven per winkel en per week/maand, vaak/soms gekocht, *vast maken*. |
| **Beheer** (`/beheer`) | Wie doet wanneer de boodschappen, vaste producten, looproute per winkel, meldingen op dit apparaat. |

Geen login: bij het eerste gebruik kies je *Ik ben Vincent/Marleen*; de telefoon onthoudt dat (cookie).

## Lokaal starten

Nodig: Node 20+ en Docker Desktop (draaiend).

```bash
npm install
npx supabase start          # lokale Supabase in Docker; past migraties en seed toe
cp .env.example .env.local  # vul de waarden in (zie hieronder)
npm run dev                 # http://localhost:3000
```

Startdata opnieuw zetten (wist alle lokale gegevens):

```bash
npx supabase db reset
```

Supabase Studio (database bekijken): http://127.0.0.1:54323

Tests: `npm test` (sortering, koppelen van aanbiedingen, bonregels, dashboard, opruiming).

## Omgevingsvariabelen

| Variabele | Waar vandaan |
|---|---|
| `SUPABASE_URL` | Lokaal `http://127.0.0.1:54321`; live: Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `npx supabase status` (lokaal) of Project Settings → API. **Alleen server-side.** |
| `ANTHROPIC_API_KEY` | console.anthropic.com. Zonder sleutel werkt alles behalve het automatisch uitlezen van foto's. |
| `ANTHROPIC_MODEL` | Standaard `claude-opus-5-5` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | `mailto:` met je e-mailadres |
| `CRON_SECRET` | Willekeurige lange tekst; Vercel Cron stuurt die mee als `Authorization: Bearer …` |

## Geplande taken

| Route | Wanneer | Wat |
|---|---|---|
| `/api/cron/opruimen` | 's nachts | Afgevinkte regels van eerdere dagen archiveren (niet wissen) |
| `/api/cron/aanbiedingen` | 's ochtends vroeg | Alle acties ophalen (PrijsProfeet, ±3 min), koppelen, watchlist-meldingen |
| `/api/cron/herinnering?moment=ochtend` | 8:00 (NL-tijd) | Herinnering aan wie volgens het weekrooster vandaag de boodschappen doet |
| `/api/cron/herinnering?moment=middag` | 15:00 (NL-tijd) | Nog een keer, alleen als er nog iets op de lijst staat |
| `/api/cron/koppelen` | handmatig | Opgeslagen acties opnieuw koppelen na wijzigingen in vaste producten |

Lokaal handmatig draaien:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/aanbiedingen
```

## Live gaan (stappenplan)

1. **Nieuw Supabase-project** aanmaken (betaald plan, regio Frankfurt). Raak `pot-laden` en `verhuisapp` niet aan.
2. Migraties toepassen:
   ```bash
   npx supabase link --project-ref <nieuw-project-ref>
   npx supabase db push
   ```
   Startdata: draai `supabase/seed.sql` één keer in de SQL-editor van het nieuwe project.
3. **Vercel**: repository koppelen, alle variabelen uit de tabel hierboven invullen (nieuwe `CRON_SECRET` en nieuwe VAPID-sleutels genereren).
4. **Cron**: `vercel.json` bevat de taken (Vercel rekent in UTC). De herinneringen draaien op beide mogelijke UTC-uren en controleren zelf of het 8:00 of 15:00 Nederlandse tijd is, dus zomer- en wintertijd kloppen vanzelf. Handmatig testen: `?nu=1`. De aanbiedingen-taak duurt ±3 minuten (`maxDuration` 300 s).
5. **Telefoons**: open de site, kies wie je bent. iPhone: Safari → Deelknop → *Zet op beginscherm*, open de app vanaf het beginscherm en zet in Beheer de meldingen aan (iOS 16.4+). Android: Chrome → *Toevoegen aan startscherm*.
6. Controleer in Beheer → *Testmelding sturen* dat meldingen aankomen.

## Opbouw

```
src/app/(app)/…         schermen (lijst, vast, watchlist, bonnen, dashboard, beheer)
src/app/*-actions.ts    server actions (alle schrijfacties)
src/app/api/…           foto-uploads, push, cron-routes
src/lib/route.ts        sorteren in de looproute, productherkenning
src/lib/prices/         prijsbron (interface + PrijsProfeet), koppelen, verversen, goedkoper elders
src/lib/vision.ts       Claude: productfoto en bonnetje uitlezen
src/lib/receipt.ts      bonregels opschonen en controleren
supabase/migrations/    databaseschema (RLS aan, alleen server-toegang)
public/sw.js            service worker (push, offline)
```

Zie `NOTES.md` voor beslissingen, de prijsdekking en open punten.
