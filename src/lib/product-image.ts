import "server-only";

// Officiële productafbeeldingen via de open databases van Open Food Facts (eten/drinken),
// Open Products Facts (huishouden) en Open Beauty Facts (verzorging). Gratis, zonder sleutel.

export type ImageCandidate = {
  url: string;
  name: string | null;
  brand: string | null;
  quantity: string | null;
  ean: string | null;
};

const SOURCES = ["world.openfoodfacts.org", "world.openproductsfacts.org", "world.openbeautyfacts.org"];
const FIELDS = "code,product_name_nl,product_name,brands,quantity,image_front_url";
const HEADERS = { "User-Agent": "Boodschappenapp/1.0 (persoonlijk gebruik)" };
const ALLOWED_IMAGE_HOST = /^https:\/\/images\.open(food|products|beauty)facts\.org\/images\/products\//;

/** Alleen afbeeldingen van deze drie databases worden bewaard. */
export function isAllowedImageUrl(url: string): boolean {
  return ALLOWED_IMAGE_HOST.test(url) && url.length <= 500;
}

type Raw = {
  code?: string;
  product_name_nl?: string;
  product_name?: string;
  brands?: string | string[];
  quantity?: string;
  image_front_url?: string;
};

function toCandidate(p: Raw): ImageCandidate | null {
  if (!p.image_front_url || !isAllowedImageUrl(p.image_front_url)) return null;
  const brand = Array.isArray(p.brands) ? p.brands[0] : p.brands?.split(",")[0];
  return {
    url: p.image_front_url,
    name: (p.product_name_nl || p.product_name || "").trim() || null,
    brand: brand?.trim() || null,
    quantity: p.quantity?.trim() || null,
    ean: p.code && /^\d{8,14}$/.test(p.code) ? p.code : null,
  };
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000), cache: "no-store" });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Zoekt op streepjescode (precies) en anders op naam. Geeft maximaal 9 kandidaten met afbeelding. */
export async function findProductImages({
  ean,
  query,
  brand,
}: {
  ean?: string | null;
  query?: string | null;
  brand?: string | null;
}): Promise<ImageCandidate[]> {
  const out: ImageCandidate[] = [];
  const seen = new Set<string>();
  const add = (c: ImageCandidate | null) => {
    if (c && !seen.has(c.url)) {
      seen.add(c.url);
      out.push(c);
    }
  };

  if (ean && /^\d{8,14}$/.test(ean)) {
    const hits = await Promise.all(
      SOURCES.map((h) => getJson<{ status: number; product?: Raw }>(`https://${h}/api/v2/product/${ean}.json?fields=${FIELDS}`)),
    );
    for (const r of hits) if (r?.status === 1 && r.product) add(toCandidate({ code: ean, ...r.product }));
  }

  // Eerst merk + naam; vindt dat te weinig, dan alleen het merk (de databases zijn vaak Frans/Duits benoemd).
  const q = query?.trim().replace(/\s+/g, " ").slice(0, 80);
  const variants = [q, brand?.trim()].filter((v, i, a): v is string => !!v && a.indexOf(v) === i);
  for (const term of variants) {
    if (out.length >= 3) break;
    const t = encodeURIComponent(term);
    const [food, products, products2] = await Promise.all([
      // Slimme zoekdienst van Open Food Facts (ook spelfouten en gedeeltelijke woorden)
      getJson<{ hits?: Raw[] }>(`https://search.openfoodfacts.org/search?q=${t}&page_size=12&fields=${FIELDS}`),
      getJson<{ products?: Raw[] }>(`https://${SOURCES[1]}/cgi/search.pl?search_terms=${t}&json=1&page_size=12&fields=${FIELDS}`),
      getJson<{ products?: Raw[] }>(`https://${SOURCES[0]}/cgi/search.pl?search_terms=${t}&json=1&page_size=12&fields=${FIELDS}`),
    ]);
    // Om en om uit de bronnen, zodat eten en huishouden allebei aan bod komen.
    const lists = [food?.hits ?? [], products?.products ?? [], products2?.products ?? []];
    for (let i = 0; i < 12 && out.length < 9; i++) for (const l of lists) if (l[i]) add(toCandidate(l[i]));
  }
  return out.slice(0, 9);
}
