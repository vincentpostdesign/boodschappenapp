// Soort product (winkel-onafhankelijk) en de bijbehorende afdeling in de looproute van een winkel.
// Losse producten krijgen zo'n soort (woordenlijst, anders Claude) en komen dan bij de juiste afdeling.
import { normalize } from "./route";

// "Zuivel", maar niet "Houdbare zuivel" (Jumbo heeft beide).
const ZUIVEL = /^zuivel|(?<!houdbare )zuivel/;

export const CATEGORIES = [
  { id: "groente", name: "Groente en fruit", dept: [/groente|fruit|agf/] },
  { id: "salades", name: "Salades", dept: [/salade/, /groente/] },
  { id: "vis", name: "Vis", dept: [/^vis\b/] },
  { id: "vlees", name: "Vlees", dept: [/^vlees$|^vlees\b(?!waren)/, /vleeswaren/] },
  { id: "brood", name: "Brood", dept: [/brood|bakker/] },
  { id: "ontbijt", name: "Ontbijt en beleg", dept: [/ontbijt|beleg/, /brood/] },
  { id: "zoetwaren", name: "Snoep en koek", dept: [/zoet|snoep|koek/, /brood/] },
  { id: "koffie", name: "Koffie", dept: [/koffie/] },
  { id: "thee", name: "Thee", dept: [/thee/, /koffie/] },
  { id: "kruiden", name: "Kruiden en specerijen", dept: [/kruiden|specerij/] },
  { id: "soepen", name: "Soepen", dept: [/soep/] },
  { id: "dranken", name: "Frisdrank en sap", dept: [/frisdrank|dranken|sap\b/, /bier|wijn/] },
  { id: "bier-wijn", name: "Bier", dept: [/bier/, /wijn/] },
  { id: "wijn", name: "Wijn", dept: [/wijn/, /bier/] },
  { id: "chips", name: "Chips en noten", dept: [/chips|noten/, /bier|wijn/] },
  { id: "vleeswaren", name: "Vleeswaren", dept: [/vleeswaren/] },
  { id: "kaas", name: "Kaas", dept: [/kaas/, ZUIVEL, /vleeswaren/] },
  { id: "houdbare-zuivel", name: "Houdbare zuivel (opschuimmelk, koffiemelk)", dept: [/houdbare zuivel/, ZUIVEL] },
  { id: "zuivel", name: "Zuivel en eieren", dept: [ZUIVEL, /kaas|vleeswaren/] },
  { id: "diepvries", name: "Diepvries", dept: [/diepvries/] },
  { id: "houdbaar", name: "Houdbaar (pasta, rijst, conserven)", dept: [/houdbaar(?! zuivel)|houdbare(?! zuivel)|pasta|conserv/] },
  { id: "huishouden", name: "Huishouden", dept: [/huishoud|schoonmaak|wasmiddel/] },
  { id: "verzorging", name: "Verzorging", dept: [/verzorging|drogist/] },
  { id: "overig", name: "Overig", dept: [] },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];
export const isCategory = (v: unknown): v is CategoryId => CATEGORIES.some((c) => c.id === v);

/** Afdeling in deze winkel voor een soort product (of null → valt onder Overig). */
export function departmentForCategory(category: string | null | undefined, departments: { id: string; name: string }[]): string | null {
  const cat = CATEGORIES.find((c) => c.id === category);
  if (!cat) return null;
  for (const pattern of cat.dept) {
    const d = departments.find((x) => pattern.test(normalize(x.name)));
    if (d) return d.id;
  }
  return null;
}

// Woordenlijst voor directe indeling. Volgorde telt: specifiek vóór algemeen
// ("kipfilet" is vlees, "kipsalade" salade, "pindakaas" ontbijt en geen kaas).
const RULES: [CategoryId, RegExp][] = [
  ["salades", /salade|rauwkost|coleslaw|huzarensalade/],
  ["diepvries", /diepvries|ijsjes?\b|^ijs\b|ijsbeker|magnum|pizza|friet|patat|kroket|bitterbal|frikandel|spinazie a la creme/],
  ["ontbijt", /pindakaas|hagelslag|jam\b|confituur|honing|muesli|cruesli|granola|cornflakes|havermout|ontbijt|nutella|chocopasta|vlokken|beschuit|crackers?|knackebrod|rijstwafel|appelstroop|speculoospasta/],
  ["vis", /\bvis\b|zalm|tonijn|haring|makreel|kabeljauw|garnalen|mosselen|pangasius|scholfilet|vissticks|lekkerbek|kibbeling/],
  ["vleeswaren", /vleeswaren|ham\b|achterham|salami|rookvlees|kipfilet beleg|boterhamworst|cervelaat|leverworst|filet american|ontbijtspek|plakjes|pate\b/],
  ["vlees", /gehakt|kipfilet|kippenpoot|kipdij|kip\b|biefstuk|varkens|rund|schnitzel|slavink|hamburger|braadworst|rookworst|worst|spek|shoarma|kalkoen|lam\b|ribs|saucijs|vlees/],
  ["kaas", /kaas|gouda|brie|mozzarella|parmezaan|feta|geitenkaas|cheddar|roomkaas/],
  ["houdbare-zuivel", /opschuim|koffiemelk|koffiecreamer|houdbare (melk|room|zuivel)|lang houdbaar|condens|spuitbus|slagroom in spuit|halvamel|kokosroom/],
  ["zuivel", /melk|karnemelk|yoghurt|kwark|vla\b|room|slagroom|creme fraiche|boter\b|roomboter|margarine|halvarine|eieren|\bei\b|skyr|toetje|pudding|chocomel|fristi|zuivel|becel|blue band/],
  ["koffie", /koffie|espresso|cappuccino|senseo|nespresso|dolce gusto|koffiebonen|koffiemelk|koffiepads|cups\b/],
  ["thee", /\bthee\b|theezakjes|rooibos|kruidenthee/],
  ["wijn", /wijn|rose\b|prosecco|cava\b|champagne|port\b|sherry|cava/],
  ["bier-wijn", /\bbier|pils|heineken|grolsch|hertog jan|amstel|radler|ipa\b|whisky|jenever|rum\b|wodka/],
  ["dranken", /\bcola|fanta|sprite|7up|ice tea|icetea|lipton|frisdrank|limonade|ranja|siroop|sap\b|jus d ?orange|sinaasappelsap|appelsap|water\b|spa\b|bronwater|tonic|energy|red bull|aa drink|smoothie|chaudfontaine|sourcy/],
  ["chips", /chips|noten|pinda|cashew|borrel|zoutjes|popcorn|nootjes|tortilla|nachos|pringles|doritos|lays/],
  ["zoetwaren", /snoep|drop|chocola|koek|koekjes|biscuit|stroopwafel|ontbijtkoek|gevulde koek|winegum|m ?m s|haribo|mars|snickers|twix|kitkat|reep|bonbon|cake|taart|gebak|wafels|spritsen|kruidnoten|pepernoten|chocoladeletter|marsepein|speculaas/],
  ["brood", /brood|bolletjes|broodjes|croissant|stokbrood|baguette|pistolet|krentenbol|tijger|volkoren|wrap|pita|ciabatta|focaccia|afbakbrood|tostis?\b|bagel|beschuitbollen/],
  ["groente", /soepgroente|verse kruiden/],
  ["soepen", /soep|bouillon/],
  ["kruiden", /specerij|kruidenmix|\bpeper\b|\bzout\b|kaneel|paprikapoeder|oregano|nootmuskaat|kerrie|komijn|knoflookpoeder|kruiden|verstegen|silvo|jonnie boer|bouillonblok/],
  ["groente", /groente|fruit|appel|peer|banaan|bananen|druif|druiven|sinaasappel|mandarijn|clementine|citroen|limoen|kiwi|mango|ananas|meloen|aardbei|framboos|blauwe bes|bessen|tomaat|tomaten|komkommer|paprika|ui\b|uien|knoflook|wortel|winterpeen|aardappel|kriel|sla\b|ijsbergsla|rucola|spinazie|broccoli|bloemkool|courgette|aubergine|prei|champignon|paddenstoel|avocado|spruit|boerenkool|andijvie|bonen|sperzie|peultjes|mais|radijs|bleekselderij|venkel|pompoen|zoete aardappel|gember|basilicum|peterselie|bieslook|koriander|munt|fruitmix|snoeptomaat/],
  ["houdbaar", /pasta|spaghetti|macaroni|penne|lasagne|noedels|mie\b|rijst|couscous|bulgur|quinoa|meel|bloem\b|suiker|olie|olijfolie|azijn|ketchup|mayonaise|mayo\b|mosterd|saus|pastasaus|conserven|blik|tomatenpuree|passata|kokosmelk|bakpoeder|gist|chips? ?saus|sambal|ketjap|sojasaus|pesto|olijven|augurk|zilveruitjes|appelmoes|bonen in blik|kikkererwten|linzen/],
  ["huishouden", /wasmiddel|wasverzachter|afwasmiddel|vaatwas|tabletten|allesreiniger|schoonmaak|wc ?papier|toiletpapier|keukenrol|keukenpapier|tissues|zakdoek|vuilniszak|afvalzak|aluminiumfolie|bakpapier|vershoudfolie|sponzen|schuurspons|batterij|lampje|kaars|lucifers|wc ?blok|bleek|ontkalker|glasreiniger|dreft|robijn|ariel|persil|omo|lenor|finish|sun\b|vanish|vaatdoek|theedoek/],
  ["verzorging", /shampoo|conditioner|douchegel|zeep|handzeep|tandpasta|tandenborstel|deo|deodorant|scheermes|scheerschuim|maandverband|tampons?|luiers|billendoekjes|wattenstaafjes|watten|bodylotion|creme|zonnebrand|pleisters|paracetamol|ibuprofen|vitamines?|haarlak|gel\b|make ?up|nagellak/],
];

/** Directe indeling op naam (null als de woordenlijst het niet weet). */
export function guessCategory(name: string): CategoryId | null {
  const n = normalize(name);
  if (!n) return null;
  for (const [cat, re] of RULES) if (re.test(n)) return cat;
  return null;
}
