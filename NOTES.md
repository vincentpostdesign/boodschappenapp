# Notities

## Beslissingen

- **Database lokaal**: Supabase CLI met Docker Desktop (`npx supabase start`). Migraties in `supabase/migrations`, startdata in `supabase/seed.sql`.
- **Geen login**: een cookie (`persoon`) onthoudt per telefoon wie je bent; `/kies` bij het eerste gebruik. **Pincode standaard uit** (instelling `pin_required` in de tabel `settings`).
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

## Open punten

- Jumbo-looproute invullen na een bezoek aan de winkel.
- Beslissen of Tim en Daan mogen meekijken.
