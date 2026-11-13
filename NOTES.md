# Notities

## Beslissingen

- **Database lokaal**: Supabase CLI met Docker Desktop (`npx supabase start`). Migraties in `supabase/migrations`, startdata in `supabase/seed.sql`.
- **Persoonlijke codes** (10 november 2026): ieder een eigen code (`settings.toegangscode_vincent` / `_marleen`, scrypt-hash; de eerste gezinscode telt als die van Vincent). Wie zijn code invult is meteen herkend: cookie `toegang` (HMAC, 400 dagen) + `persoon`. Zonder toegang is niets bereikbaar (pagina's én API, behalve de cron-routes met hun eigen geheim). Na 5 foute pogingen per IP 15 minuten blokkade (`access_attempts`). In Beheer: eigen code wijzigen, eerste code voor een ander instellen, telefoon afmelden. Een browser kan geen MAC-adres uitlezen; de persoonlijke code is daarom de manier om iemand te herkennen.
- **Profielfoto** (zoals pot-laden): kiezen, rond uitsnijden in de app, opgeslagen als 512×512 JPEG in bucket `fotos/personen/`. Getoond als kleine ingebedde afbeelding (192 px, één keer per pagina als stijl): het losse fotobestand kwam in de iPhone-webapp half binnen. Zonder foto de initiaal.
- **Weekrooster** (10 november 2026): wie de boodschappen doet staat per weekdag in `settings.weekrooster` (7 plaatsen, maandag = 0) en geldt elke week. Bij het eerste gebruik overgenomen uit de losse datums. `shopper_days` is nu alleen nog het logboek van de ochtendherinnering.
- **Lijst**: veeg naar links voor Verwijderen (ver doorvegen verwijdert direct); − / + direct in de regel.
- **Beheer → App verversen**: servercache vernieuwen, app-cache op de telefoon legen, nieuwste versie laden.
- **Samen live**: elke wijziging hoogt `settings.versie` op (na het antwoord, met `after()`); open apps vragen `/api/versie` elke 3 s op (alleen als de app zichtbaar is, en direct bij terugkomen) en verversen zichzelf bij een nieuwe versie. Getest: toevoeging van de ander zichtbaar na ±2 s.
- **Snelheid**: Vercel-functies in Frankfurt (`regions: ["fra1"]`, naast de database); winkels, afdelingen, vaste producten, personen en prijzen in de servercache (labels `catalogus`, `prijzen`, `mensen`), ververst bij elke wijziging.
- **Alle databasetoegang via de server** (server actions en route handlers) met de service-role-sleutel. RLS staat aan op alle tabellen zonder publieke policies, dus de publieke sleutel kan niets.
- **Jumbo-looproute**: nog onbekend. Voorlopige indeling van 16 afdelingen (Groente en fruit … Zuivel, Diepvries, Overig), passend bij de afdelingen uit de producttabel (Zuivel, Brood, Ontbijt, Noten en chips). Aanpasbaar in Beheer.
- **Plus, Albert Heijn, Lidl**: voorlopig dezelfde afdelingsvolgorde als de Aldi.
- **Regels zonder afdeling** (vrij ingetypt, geen vast product) komen onder "Overig".
- **Tim en Daan**: voorlopig niet; alleen Vincent en Marleen. Uitbreiden kan door een rij in `people` toe te voegen.
- **Goede aanbieding** (watchlist): voldoet aan de prijsgrens als die is ingesteld, én aan het minimale kortingspercentage als dat is ingesteld. Geen van beide ingesteld: elke actie van het voorkeursmerk telt.
- **Watchlist-meldingen**: standaard direct, instelbaar op wekelijks (maandag).

## Prijsdekking PrijsProfeet (getest 9 november 2026)

API: `https://www.prijsprofeet.nl/api/v1`, zonder sleutel: 120 verzoeken/min op zoeken en detail, 30/min op bulk.

Belangrijk: de gratis endpoints (`/search`, `/products`, `/products/promotional/all`) leveren in de praktijk **alleen aanbiedingen uit folders**, geen gewone schapprijzen. Schapprijzen (`/shelf-prices`) en vergelijken op EAN (`/match/ean`) zitten in het betaalde Pro-plan.

Aantal treffers per winkel (tussen haakjes: waarvan aanbieding):

| Zoekterm | Aldi | Jumbo | Plus | AH | Lidl |
|---|---|---|---|---|---|
| magere kwark | 0 | 5 (5) | 0 | 7 (7) | 0 |
| halfvolle melk | 0 | 3 (3) | 5 (5) | 4 (4) | 0 |
| optimel | 1 (1) | 1 (1) | 12 (12) | 14 (14) | 0 |
| gorgonzola | 0 | 1 (1) | 0 | 1 (1) | 0 |
| walnoten | 0 | 6 (6) | 1 (1) | 3 (3) | 0 |
| bananen | 1 (1) | 39 (39) | 22 (22) | 10 (10) | 1 (1) |
| lenor pods | 0 | 0 | 2 (2) | 2 (2) | 0 |
| wc papier / toiletpapier | 1–2 | 4–9 | 6–8 | 3–35 | 0 |
| afwasmiddel | 0 | 11 (11) | 0 | 0 | 0 |
| vaatwastabletten | 0 | 7 (7) | 2 (2) | 8 (8) | 0 |

Conclusies:
- **Aldi en Lidl staan er nauwelijks in.** Aldi-prijzen moeten dus van de **bonnetjes** komen (zoals voorzien).
- **Watchlist werkt goed** voor Jumbo, Albert Heijn en Plus: daar staan de huishoudaanbiedingen wel in.
- **"Goedkoper elders"** kan alleen als er een Aldi-prijs (van een bon) én een lagere prijs elders bekend is. Zonder Aldi-prijs: geen icoon, niets verzinnen.
- Optie voor later: Pro-plan voor echte schapprijzen. Eerst kijken hoe ver we komen met bonnen en acties.

### Volledige ophaalrun (9 november 2026)

`/products/promotional/all` per winkel: Aldi 267, Jumbo 2.614, Plus 2.344, AH 2.617, Lidl 42 acties. Door de bulk-limiet (30/min) duurt één run ±3 minuten.

### Koppelen van acties aan vaste producten

Eerste versie (alleen woorden) koppelde 186 acties, met veel fouten (babyhapjes bij bananen, Fanta Kiwi bij kiwi's, ravioli bij walnoten). Nu combineert de koppeling:
1. **categorie** van de bron moet passen bij de afdelingen van het product (zuivel → `zuivel-eieren`/`kaas`, enz.);
2. alle woorden van de **productnaam** en minstens één onderscheidend woord uit de **omschrijving**;
3. een **woordfilter** voor samengestelde producten en smaakjes (ovenschotel, drink, baby, repen, vanille …), met de Nederlandse regel dat het laatste deel van een samenstelling bepaalt wat het is (drinkyoghurt = yoghurt, mueslireep = reep);
4. hooguit 3 extra woorden naast merk en productwoorden.

Resultaat: 45 koppelingen, bij steekproef allemaal juist. Liever een gemiste koppeling dan een verkeerde.

**Let op bij "goedkoper elders":** de vergelijking is per verpakking, niet per liter/kilo (de bron geeft lang niet altijd een eenheidsprijs). Campina 1,5 L in de actie tegenover Aldi 2 L telt dus als "goedkoper". Het icoon is een hint, geen garantie. Verbetering voor later: inhoud uit de naam halen en per eenheid vergelijken.

## Overige beslissingen tijdens het bouwen

- **Claude-model**: `claude-opus-5-5`, effort `medium`, gestructureerde output (Zod-schema). Met `fallbacks: "default"`: weigert het model een foto onterecht, dan probeert de API het automatisch met een ander model.
- **Foto's** worden op de server verkleind (max. 1600 px, JPEG) en in de privé-bucket `fotos` bewaard; tonen via tijdelijke links (1 uur).
- **Bonnetjes**: de foto wordt altijd eerst opgeslagen, ook als uitlezen mislukt. Een bon blijft "nieuw" tot hij gecontroleerd is; pas dan telt hij mee in het dashboard en worden aliassen en referentieprijzen opgeslagen.
- **Watchlist-meldingen**: per watchlist-product één melding per run (beste aanbieding + aantal andere), anders kreeg je de eerste dag tientallen meldingen. Melding gaat naar wie het product toevoegde; bij de startdata (geen toevoeger) naar allebei.
- **Melding bij aanwijzen**: wie een ander aanwijst stuurt die persoon een melding; jezelf aanwijzen geeft geen melding.
- **Herinneringen** om 8:00 en 15:00 Nederlandse tijd (de 15:00-melding alleen als er nog iets te halen is). Vercel rekent in UTC; de taken draaien op beide mogelijke uren en de route controleert het Nederlandse uur.
- **Cadeaulijst** (Beheer → Cadeaulijst): per gelegenheid (Sint, kerst, verjaardag, overig), gegroepeerd per ontvanger, met prijs, link en notitie. "Geheim" maakt een cadeau alleen zichtbaar voor wie het toevoegde (verrassing voor de ander); de server haalt geheime cadeaus van de ander niet eens op. Opent automatisch op de eerstvolgende gelegenheid (t/m 5 dec Sint, t/m 26 dec kerst).
- **Watchlist-foto's**: twee foto's per product (voorkant: Claude leest merk/naam/inhoud; streepjescode: Claude leest de EAN, die alleen wordt overgenomen als het controlecijfer klopt). Optioneel een officiële afbeelding uit Open Food Facts / Open Products Facts / Open Beauty Facts: eerst op EAN, anders op merk + naam en daarna alleen merk. Alleen afbeeldingen van images.open*facts.org worden bewaard (als link); die heeft voorrang als miniatuur in de lijst.
- **Bonnen**: namen in gewone schrijfwijze (Claude zet merknamen goed; vangnet `niceCase` voor alleen-hoofdletters). Oudere bonnen worden bij openen eenmalig omgezet. Per regel een knop "op de lijst" (gekoppeld vast product, anders de bonnaam) en "Alles op de lijst". Verwijderen vraagt een tweede stap: WISSEN typen (ook op de server gecontroleerd).
- **iPhone: menu blijft na het toetsenbord halverwege staan** (vaste balken op de oude plek). `ViewportFix` scrollt na het sluiten van het toetsenbord 1 pixel heen en terug, zodat Safari ze opnieuw plaatst.
- **Scoupy** (`src/lib/scoupy.ts`, `scoupy-store.ts`): de cashback-acties staan openbaar op scoupy.com/nl-NL/groceries (Next.js-gegevens in de HTML, geen API). We bewaren de cashback-acties in settings.scoupy en verversen op de achtergrond als ze ouder dan 2 uur zijn, plus in de ochtendtaak. Op de lijst krijgt een regel een roze Scoupy-label als het merk (heel woord) of alle woorden van de naam in een actie voorkomen. Op de Watchlist een eigen overzicht met zoeken en "op de lijst". Verandert Scoupy de pagina, dan blijven de oude gegevens staan (geen lege lijst).
- **Losse producten in de juiste afdeling** (`src/lib/categories.ts`, `src/lib/categorize.ts`): elke regel zonder gekoppelde afdeling krijgt een winkel-onafhankelijke soort (groente, zuivel, dranken, …), die per winkel naar de afdeling wordt vertaald (Jumbo: Zuivel; Aldi: Vleeswaren kaas en zuivel). Volgorde: met de hand gekozen → onthouden (tabel category_memory) → woordenlijst → Claude op de achtergrond (after()). Frisdrank/sap valt in winkels zonder drankafdeling onder Bier/wijn. Verplaatsen kan in het uitklapmenu van een regel; dat wordt per naam onthouden. Zonder de migratie categorie_los werkt alleen de woordenlijst (verplaatsknop verborgen).
- **Offline in de winkel** (`public/sw.js` v5 + `src/lib/offline-queue.ts`): app-bestanden worden bewaard (cache-first), pagina's netwerk-eerst met 3 s tijdslimiet en daarna de bewaarde versie (bij één streepje bereik geen wit scherm meer). Bij elke bewaarde pagina ook alle scripts/opmaak uit die pagina. De vijf hoofdschermen worden bij installatie alvast bewaard; LiveSync laat de lijst opnieuw bewaren na elke wijziging. Navigatiegegevens (RSC) na 4 s een snelle fout, zodat Next.js terugvalt op de bewaarde pagina. Afvinken, aantal, verwijderen en toevoegen gaan via een wachtrij in localStorage (max. 8 s wachten op de server) en worden verstuurd zodra het weer kan; toevoegen met een eigen id, dus nooit dubbel. Getest met een echte productiebuild in onzichtbare Chrome: server uit → lijst en Vast laden, afvinken/toevoegen bewaard; server aan → wachtrij binnen seconden verstuurd. Trage (in plaats van geen) verbinding is niet nagebootst.
- **Testen in een verborgen browservenster**: daar blijft een service worker op "installing" hangen; test offline-gedrag in (onzichtbare) Chrome.
- **Testen in een verborgen browservenster**: React toont gestreamde inhoud pas na `requestAnimationFrame`; in een verborgen venster blijft dan het laadscherm staan. Geen fout in de app.
- **Opruiming** archiveert afgevinkte regels van vóór vandaag (Nederlandse tijd); niets wordt gewist.

## Live-omgeving

- **GitHub**: `vincentpostdesign/Boodschappenapp` (branch `main`, openbaar).
- **Supabase**: project *Boodschappenapp* (ref `fvtlvgravofejdzhujeh`) in organisatie *Privé* (Free-plan), regio Europa. Aangemaakt op 10 november 2026, "nieuwe tabellen automatisch openstellen" uit.
- Database opgezet met `supabase/live-setup.sql` via de SQL-editor (alle migraties + startdata). Gecontroleerd: 5 winkels, 60 afdelingen, 16 vaste producten, 4 watchlist-items, RLS op alle tabellen, geen publieke policies, bucket `fotos` privé, anonieme sleutel heeft geen leesrechten.
- Let op: omdat de migraties via de SQL-editor zijn gedraaid, kent de Supabase-CLI ze nog niet. Wil je later `npx supabase db push` gebruiken, markeer ze dan eerst als toegepast: `npx supabase migration repair --status applied 20261109000000 20261109010000 20261109020000 20261110000000 20261110010000 20261110020000`.
- **Vercel**: project *boodschappenapp* in team *vincentpost-3237's projects* (Pro), live op **https://boodschappen.vincentpost.nl** (CNAME `boodschappen` in DirectAdmin van hostingpakket 89811 → Vercel; SSL via Vercel; http stuurt door naar https). Reserve-adres: https://boodschappenapp-kappa.vercel.app. Elke push naar `main` deployt automatisch. Variabelen staan in Vercel; de bron is `.env.vercel` (lokaal, buiten git).
- Rechten: met "expose new tables" uit kreeg ook `service_role` geen rechten; opgelost met migratie `20261110000000_rechten_server.sql` (alleen de server krijgt rechten, anon/authenticated niet).
- Free-plan: het project gaat na een week zonder verkeer op pauze; de dagelijkse cron-taken op Vercel houden het actief.

## Open punten

- [ ] ANTHROPIC_API_KEY toevoegen in Vercel (Settings → Environment Variables) en opnieuw deployen, voor het uitlezen van foto's.

- [ ] Claude API-sleutel in `.env.local` zetten en het uitlezen testen met een echte foto van een product en een echte bon (alleen getest zonder sleutel: foto opslaan + handmatig invullen).
- [ ] Pushmeldingen testen op een echte telefoon (de testomgeving blokkeert meldingen; de serverkant is getest).
- [ ] Jumbo-looproute invullen na een bezoek aan de winkel.
- [ ] Beslissen of Tim en Daan mogen meekijken.
- [ ] "Goedkoper elders" per liter/kilo vergelijken.
- [ ] Eventueel PrijsProfeet Pro voor schapprijzen (ook Aldi?), als bonnen niet genoeg dekking geven.
