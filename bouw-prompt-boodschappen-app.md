# Bouwopdracht: gezamenlijke boodschappen-app (Vincent en Marleen)

Plak dit in Claude Code, in een lege projectmap. Zet het bestand `boodschappen-mockup-v2.html` eerst in een submap `design/`, als visuele referentie.

---

## Doel

Bouw lokaal een mobile-first webapp (PWA) waarmee Vincent en Marleen samen een boodschappenlijst bijhouden. Eerst alleen lokaal draaien en testen. Pas als alles goed werkt gaan we live (Vercel + Supabase). Werk in het Nederlands in alle schermen en teksten.

Begin met een korte planning (mijlpalen), laat die zien en ga daarna zelfstandig door. Bouw per mijlpaal, test elke mijlpaal en commit na elke mijlpaal.

## Context

- Gezin woont in Harderwijk (Drielanden). Standaardwinkel is de **Aldi**, daarna de **Jumbo**. Verder weg (Ermelo): Plus, Albert Heijn, Lidl.
- Twee gebruikers: **Vincent** en **Marleen**. Marleen kan niet via VPN werken, dus de app moet gewoon op het open internet bereikbaar zijn (later).
- Niet steeds inloggen. Elke telefoon onthoudt eenmalig wie hij is. Optioneel een pincode van vier cijfers bij het eerste gebruik.
- Stack: Next.js (App Router, TypeScript), Tailwind, Supabase (Postgres, Storage), later Vercel.
- **Raak de bestaande Supabase-projecten `pot-laden` en `verhuisapp` niet aan.** Gebruik nu een lokale Supabase (Supabase CLI met Docker, `supabase start`). Houd alle migraties in `supabase/migrations`, zodat we ze later op een nieuw betaald project kunnen toepassen.

## Schermen en functies

### 1. Boodschappenlijst (hoofdscherm)
- Bovenaan datum en een balk: "Marleen doet vandaag de boodschappen" (of "Jij doet vandaag de boodschappen" voor degene die het is).
- Keuze "Ik ben Vincent / Ik ben Marleen", onthouden op de telefoon.
- Winkelkeuze bovenaan (Aldi standaard).
- Producten staan **gesorteerd in de looproute van de gekozen winkel**, gegroepeerd per afdeling met de afdelingsnaam als kopje.
- Per regel: afvinkvakje, naam, aantal, wie het toevoegde (bolletje V of M) en datum.
- Toevoegen via invoerveld, en vanuit de vaste producten.
- Afgevinkte producten komen onder "Gehaald". Een nachtelijke taak haalt de afgevinkte regels van de lijst (archiveren, niet wissen, want het dashboard heeft de historie nodig).
- Icoontje "goedkoper elders" bij een product als er een lagere prijs bekend is bij een andere winkel dan de standaardwinkel, met winkel en verschil (bijvoorbeeld "Jumbo −€0,45"). Is er geen prijs bekend, dan geen icoontje.

### 2. Vaste producten
- Lijst van producten die jullie standaard kopen, per afdeling. Eén tik zet een product op de lijst van vandaag. Knop "Zet alle vaste producten erop". Product dat al op de lijst staat toont "Op de lijst".
- Zoekveld bovenaan.

### 3. Beheer
- Zoeken in alle vaste producten, toevoegen, aanpassen, verbergen (seizoensproducten) en verwijderen.
- Per product: naam, omschrijving, gebruikelijk aantal, standaardwinkel en **afdeling per winkel** (Aldi en Jumbo kunnen verschillen).
- Per winkel de **volgorde van de afdelingen** aanpassen (slepen of omhoog/omlaag).
- Instellen wie vandaag de boodschappen doet.
- Beheer van de watchlist (zie hieronder).

### 4. Wie doet de boodschappen en meldingen
- Per dag één persoon aanwijzen. Die krijgt een pushmelding en 's ochtends een herinnering met het aantal producten.
- Web push (service worker, VAPID). Op iPhone werkt dit alleen als de app op het beginscherm staat (iOS 16.4 of hoger). Maak een korte uitleg in de app over "Zet op beginscherm".
- Bouw eerst de meldingen lokaal werkend met een testknop.

### 5. Watchlist (vooral voor Marleen)
- Voor producten die je niet wekelijks koopt maar waarvan je de goede aanbiedingen wilt weten. Startvoorbeelden: Lenor wasmiddelpods, wc-papier, afwasmiddel, vaatwastabletten.
- Per product een voorkeursmerk en optioneel een prijsgrens en/of minimaal kortingspercentage. Een melding komt alleen bij een **goede aanbieding van dat specifieke merk**.
- Aanbiedingen worden dagelijks opgehaald. Bij een treffer: melding met winkel, prijs en looptijd, en één tik zet het op de boodschappenlijst.
- Instelling voor meldingen: direct, of één keer per week gebundeld (maandag). Standaard direct.
- **Product toevoegen met een foto**: Marleen kan in de winkel een foto maken van het product. De app haalt via Claude (vision) de productinformatie op (merk, naam, inhoud, EAN als die zichtbaar is). Zij bevestigt of het het juiste product is en kan corrigeren. Daarna staat het op de watchlist.
- Toevoegen en verwijderen van watchlist-items gebeurt in de beheersectie.

### 6. Bonnetjes en dashboard
- Knop om een bonnetje te fotograferen of een foto te kiezen. De foto wordt meteen opgeslagen (Supabase Storage).
- Uitlezen met Claude (vision): winkel, datum, regels met productnaam zoals op de bon, aantal en prijs. Toon de regels ter controle en laat corrigeren voor het opslaan, want uitlezen is niet altijd perfect (kreukels, vage foto's).
- Bewaar per winkel de bonnaam van een product als alias en koppel die aan het vaste product, zodat de app de echte namen bij de Aldi en de Jumbo leert.
- Dashboard: wat kopen jullie vaak, wat maar soms, uitgaven per winkel en per periode. Stel voor om een vaak gekocht product vast te maken.
- Gebruik de prijzen van de bonnen als referentieprijs voor de Aldi, want die ontbreken vaak in openbare bronnen.

## Prijzen en aanbiedingen

- Er is geen officiële API van de supermarkten. Gebruik de PrijsProfeet-API (gratis zoeken, producten en aanbiedingen zonder sleutel; ketens o.a. Albert Heijn, Aldi, Jumbo, Lidl, Plus). Lees eerst de documentatie in de GitHub-repo `PrijsProfeet/supermarkt-api` en controleer de juiste basis-URL voor Nederland, en de limieten.
- Maak een eigen laag `lib/prices` met één interface, zodat we de bron later kunnen vervangen.
- Cache de aanbiedingen in de database en ververs dagelijks.
- **Test vroeg** hoe goed de dekking is voor de Aldi en voor huishoudproducten (wc-papier, wasmiddel, vaatwastabletten). Schrijf het resultaat in `NOTES.md`. Is een prijs onbekend, toon dan niets en verzin niets.

## Startdata (seed)

Winkels: Aldi (standaard), Jumbo, Plus, Albert Heijn, Lidl.

Afdelingsvolgorde **Aldi**: Groente en fruit, Salades, Vis, Vlees, Brood en zoetwaren, Koffie, Thee, Bier wijn noten en chips, Vleeswaren kaas en zuivel, Diepvries, Overig.

Afdelingsvolgorde **Jumbo**: nog niet bekend. Gebruik tijdelijk dezelfde indeling met extra afdeling Ontbijt, aanpasbaar in Beheer.

Vaste producten (naam, omschrijving, afdeling Aldi, afdeling Jumbo):

| Product | Omschrijving | Aldi | Jumbo |
|---|---|---|---|
| Kwark | Magere kwark, 500 ml | Vleeswaren, kaas en zuivel | Zuivel |
| Melk | Halfvolle melk, 2 liter | Vleeswaren, kaas en zuivel | Zuivel |
| Yoghurt | Optimel, framboos of passievrucht, 1 liter | Vleeswaren, kaas en zuivel | Zuivel |
| Gorgonzola | 1 pak | Vleeswaren, kaas en zuivel | Zuivel |
| Crème fraîche | Eigen merk | Vleeswaren, kaas en zuivel | Zuivel |
| Room | Roompakje, vers, eigen merk | Vleeswaren, kaas en zuivel | Zuivel |
| Volkorenbrood | Heel | Brood en zoetwaren | Brood |
| Volkorenbrood | Tijger | Brood en zoetwaren | Brood |
| Salade | Caesar salad | Salades | Salades |
| Salade | Boerensalade | Salades | Salades |
| Bananen | | Groente en fruit | Groente en fruit |
| Kiwi's | | Groente en fruit | Groente en fruit |
| Druiven | | Groente en fruit | Groente en fruit |
| Muesli | | Bier wijn noten en chips | Ontbijt |
| Walnoten | Gewoon | Bier wijn noten en chips | Noten en chips |
| Cashewnoten | Gebrand, ongezouten | Bier wijn noten en chips | Noten en chips |

Watchlist-seed: Lenor wasmiddelpods, wc-papier, afwasmiddel, vaatwastabletten.

## Datamodel (voorstel, pas aan waar nodig)

people, stores, departments (per winkel, met volgorde), products (vaste producten, verbergbaar), product_store_department, list_items (naam, aantal, winkel, afdeling, toegevoegd door, toegevoegd op, gehaald, gehaald op, gearchiveerd), shopper_days (datum, persoon), watchlist_items (naam, merk, foto, EAN, prijsgrens, kortingsgrens), offers_cache, receipts, receipt_lines, product_aliases, push_subscriptions.

Zet row level security aan en houd de service-role sleutel alleen op de server. De Claude API-sleutel staat in `.env.local` en wordt alleen server-side gebruikt (route handlers). Lever een `.env.example` mee.

## Ontwerp

Mobile-first, grote tikdoelen, snel in de winkel te gebruiken. Volg de indeling van `design/boodschappen-mockup-v2.html` voor lijst, vaste producten en beheer. Ontwerp zelf de schermen voor watchlist en bonnetjes/dashboard in dezelfde stijl. Installeerbaar als PWA (manifest, icoon, service worker).

## Werkwijze en oplevering

1. Toon eerst de planning en de keuzes die je maakt (korte lijst).
2. Bouw per mijlpaal: database en seed, lijst en vaste producten, beheer, wie-doet-boodschappen en meldingen, prijzen en goedkoper-elders-icoon, watchlist (incl. foto), bonnetjes en dashboard, nachtelijke opruiming.
3. Test elke mijlpaal echt (draai de app, klik door, controleer de database). Schrijf basistests voor de sorteerlogica, de opruiming en het uitlezen van bonregels.
4. Lever een `README.md` met: lokaal starten, seed draaien, env-variabelen, en een stappenplan voor live gaan (nieuw Supabase-project, migraties toepassen, Vercel, cron voor de nachtelijke taak en de dagelijkse aanbiedingen, VAPID-sleutels).
5. Houd `NOTES.md` bij met open punten, bevindingen over de prijsdekking en beslissingen.

## Nog open (kies een verstandige standaard en zet het in NOTES.md)

- Pincode wel of niet standaard aan.
- Of de jongens (Tim en Daan) mogen meekijken.
- Definitie van "goede aanbieding": prijsgrens, kortingspercentage of beide (nu beide optioneel).
- Meldingen direct of wekelijks (nu direct, instelbaar).
- De Jumbo-looproute.
