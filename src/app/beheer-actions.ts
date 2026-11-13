"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { bumpVersion } from "@/lib/version";
import { TAG_CATALOGUS, TAG_PRIJZEN, getWeekSchedule } from "@/lib/data";
import { WEEKDAYS, weekdayIndex } from "@/lib/schedule";
import { TAG_MENSEN } from "@/lib/people";
import { TAG_SOORTEN } from "@/lib/categorize";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, check } from "@/lib/db";
import { PEOPLE, isPersonId, requirePerson } from "@/lib/session";
import { openItemCount, productenTekst, sendToPerson } from "@/lib/push";
import { todayNL } from "@/lib/dates";

function refresh() {
  revalidateTag(TAG_CATALOGUS);
  revalidateTag(TAG_PRIJZEN);
  revalidatePath("/", "layout");
  after(bumpVersion);
}

/** Knop "App verversen": alle bewaarde gegevens opnieuw ophalen. */
export async function refreshAllData() {
  await requirePerson();
  refresh();
  revalidateTag(TAG_MENSEN);
  revalidateTag(TAG_SOORTEN);
}

// ---------- wie doet de boodschappen ----------

/** Vast weekrooster: wie doet op deze weekdag (0 = maandag) de boodschappen; null = niemand. */
export async function setWeekdayShopper(weekday: number, person: string | null) {
  const me = await requirePerson();
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw new Error("Onbekende dag");
  if (person !== null && !isPersonId(person)) throw new Error("Onbekende persoon");
  const schedule = await getWeekSchedule();
  if (schedule[weekday] === person) return;
  schedule[weekday] = person;
  check(await db().from("settings").upsert({ key: "weekrooster", value: schedule }), "weekrooster opslaan");

  // Melding naar wie wordt aangewezen (niet als je jezelf aanwijst).
  if (person && person !== me) {
    const today = todayNL();
    const isToday = weekdayIndex(today) === weekday;
    const n = await openItemCount();
    await sendToPerson(person, {
      title: isToday ? "Jij doet vandaag de boodschappen" : `Jij doet voortaan op ${WEEKDAYS[weekday].toLowerCase()} de boodschappen`,
      body: `${PEOPLE[me].name} heeft je ingeroosterd. Er staan nu ${productenTekst(n)} op de lijst.`,
      url: "/",
      tag: `rooster-${weekday}`,
    });
  }
  refresh();
}

// ---------- producten ----------

const productSchema = z.object({
  name: z.string().trim().min(1, "Naam is verplicht").max(80),
  description: z.string().trim().max(160),
  default_quantity: z.coerce.number().int().min(1).max(99),
  default_store_id: z.string().min(1),
});

export type ProductFormState = { error?: string } | undefined;

export async function saveProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  await requirePerson();
  const id = (formData.get("id") as string) || null;
  const parsed = productSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    default_quantity: formData.get("default_quantity") ?? 1,
    default_store_id: formData.get("default_store_id") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Controleer de velden" };
  const values = { ...parsed.data, description: parsed.data.description || null };

  let productId = id;
  if (id) {
    check(await db().from("products").update(values).eq("id", id), "product opslaan");
  } else {
    const row = check(await db().from("products").insert(values).select("id").single(), "product toevoegen") as { id: string };
    productId = row.id;
  }

  // Afdeling per winkel: velden 'dep_<storeId>' met een afdelings-id of leeg.
  const deps: { product_id: string; store_id: string; department_id: string }[] = [];
  const cleared: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("dep_")) continue;
    const storeId = key.slice(4);
    if (value) deps.push({ product_id: productId!, store_id: storeId, department_id: String(value) });
    else cleared.push(storeId);
  }
  if (deps.length) {
    // Controleer dat elke afdeling bij de juiste winkel hoort.
    const valid = check(
      await db().from("departments").select("id, store_id").in("id", deps.map((d) => d.department_id)),
      "afdelingen",
    ) as { id: string; store_id: string }[];
    const ok = new Set(valid.map((v) => `${v.store_id}:${v.id}`));
    const good = deps.filter((d) => ok.has(`${d.store_id}:${d.department_id}`));
    check(await db().from("product_store_department").upsert(good), "afdelingen opslaan");
  }
  if (cleared.length) {
    check(
      await db().from("product_store_department").delete().eq("product_id", productId!).in("store_id", cleared),
      "afdelingen wissen",
    );
  }

  // Openstaande lijstregels van dit product meenemen in de nieuwe naam/omschrijving.
  if (id) {
    check(
      await db()
        .from("list_items")
        .update({ name: values.name, description: values.description })
        .eq("product_id", id)
        .eq("archived", false),
      "lijst bijwerken",
    );
  }
  refresh();
  redirect("/beheer/producten");
}

/** Vanuit het dashboard: een vaak gekocht los product vast maken (afdeling later in Beheer). */
export async function makeFixedProduct(name: string) {
  await requirePerson();
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 80);
  if (!clean) return;
  const store = check(await db().from("stores").select("id").eq("is_default", true).maybeSingle(), "winkel") as { id: string } | null;
  const row = check(
    await db().from("products").insert({ name: clean, default_store_id: store?.id ?? null }).select("id").single(),
    "vast product",
  ) as { id: string };
  // Losse lijstregels met dezelfde naam aan het nieuwe product koppelen
  check(await db().from("list_items").update({ product_id: row.id }).is("product_id", null).ilike("name", clean), "lijst koppelen");
  refresh();
}

export async function setProductHidden(id: string, hidden: boolean) {
  await requirePerson();
  check(await db().from("products").update({ hidden }).eq("id", id), "verbergen");
  refresh();
}

export async function deleteProduct(id: string) {
  await requirePerson();
  // Lijstregels en bonregels blijven bestaan (product_id wordt null), zodat de historie niet verdwijnt.
  check(await db().from("products").delete().eq("id", id), "verwijderen");
  refresh();
  redirect("/beheer/producten");
}

/** Vast product verwijderen vanaf het scherm Vast (veegbeweging + WISSEN); blijft op dat scherm. */
export async function removeFixedProduct(id: string, confirmation: string) {
  await requirePerson();
  if (confirmation !== "WISSEN") throw new Error("Typ WISSEN om het product te verwijderen");
  check(await db().from("products").delete().eq("id", id), "verwijderen");
  refresh();
}

// ---------- afdelingen / looproute ----------

async function storeDepartments(storeId: string) {
  return check(
    await db().from("departments").select("id, name, sort_order").eq("store_id", storeId).order("sort_order"),
    "afdelingen",
  ) as { id: string; name: string; sort_order: number }[];
}

/** Zet de volgorde in één keer (na slepen of omhoog/omlaag). */
export async function reorderDepartments(storeId: string, orderedIds: string[]) {
  await requirePerson();
  const current = await storeDepartments(storeId);
  const known = new Set(current.map((d) => d.id));
  if (orderedIds.length !== current.length || !orderedIds.every((id) => known.has(id))) {
    throw new Error("De afdelingen zijn intussen gewijzigd; laad de pagina opnieuw.");
  }
  const rows = orderedIds.map((id, i) => ({ id, store_id: storeId, name: current.find((d) => d.id === id)!.name, sort_order: i + 1 }));
  check(await db().from("departments").upsert(rows), "volgorde opslaan");
  refresh();
}

export async function addDepartment(storeId: string, name: string) {
  await requirePerson();
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) return;
  const current = await storeDepartments(storeId);
  if (current.some((d) => d.name.toLowerCase() === clean.toLowerCase())) throw new Error("Die afdeling bestaat al");
  // Nieuwe afdeling vóór "Overig" als die bestaat, anders achteraan.
  const overig = current.find((d) => d.name.toLowerCase() === "overig");
  const ins = check(
    await db().from("departments").insert({ store_id: storeId, name: clean, sort_order: current.length + 1 }).select("id").single(),
    "afdeling toevoegen",
  ) as { id: string };
  if (overig) {
    const ids = current.map((d) => d.id).filter((id) => id !== overig.id);
    await reorderDepartments(storeId, [...ids, ins.id, overig.id]);
  }
  refresh();
}

export async function renameDepartment(id: string, name: string) {
  await requirePerson();
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) return;
  check(await db().from("departments").update({ name: clean }).eq("id", id), "afdeling hernoemen");
  refresh();
}

export async function deleteDepartment(id: string) {
  await requirePerson();
  // Producten in deze afdeling verliezen hun koppeling en vallen onder "Overig".
  check(await db().from("departments").delete().eq("id", id), "afdeling verwijderen");
  refresh();
}

export async function copyRoute(fromStoreId: string, toStoreId: string) {
  await requirePerson();
  if (fromStoreId === toStoreId) return;
  const source = await storeDepartments(fromStoreId);
  const target = await storeDepartments(toStoreId);
  const byName = new Map(target.map((d) => [d.name.toLowerCase(), d]));
  // Bestaande afdelingen met dezelfde naam krijgen de volgorde van de bron; ontbrekende worden toegevoegd.
  let n = 0;
  const rows = [];
  for (const s of source) {
    const t = byName.get(s.name.toLowerCase());
    rows.push(t ? { id: t.id, store_id: toStoreId, name: t.name, sort_order: ++n } : { store_id: toStoreId, name: s.name, sort_order: ++n });
    byName.delete(s.name.toLowerCase());
  }
  for (const rest of byName.values()) rows.push({ id: rest.id, store_id: toStoreId, name: rest.name, sort_order: ++n });
  const withId = rows.filter((r) => "id" in r);
  const withoutId = rows.filter((r) => !("id" in r));
  if (withId.length) check(await db().from("departments").upsert(withId), "route kopiëren");
  if (withoutId.length) check(await db().from("departments").insert(withoutId), "route kopiëren");
  refresh();
}
