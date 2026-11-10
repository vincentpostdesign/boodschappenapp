import { choosePerson } from "../actions";
import { hasAccess, isCodeSet } from "../toegang-actions";
import { CodeForm } from "@/components/CodeForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welkom · Boodschappen" };

export default async function KiesPage() {
  const access = await hasAccess();
  if (!access) {
    const codeSet = await isCodeSet();
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-10">
        <div>
          <p className="text-sm font-medium text-accent">Boodschappen</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{codeSet ? "Gezinscode" : "Kies een gezinscode"}</h1>
          <p className="mt-2 text-muted">
            {codeSet
              ? "Vul de gezinscode in. Deze telefoon onthoudt hem, je hoeft dit maar één keer te doen."
              : "Met deze code komt alleen het gezin in de app. Kies 6 of meer cijfers en geef hem door aan wie mee mag doen."}
          </p>
        </div>
        <CodeForm mode={codeSet ? "invoeren" : "instellen"} />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-10">
      <div>
        <p className="text-sm font-medium text-accent">Boodschappen</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Wie ben jij?</h1>
        <p className="mt-2 text-muted">Deze telefoon onthoudt het. Je hoeft dit maar één keer te doen.</p>
      </div>
      <form action={choosePerson} className="grid gap-3">
        <button
          name="person"
          value="vincent"
          className="flex h-20 items-center gap-4 rounded-2xl border border-line bg-surface px-5 text-left text-xl font-semibold shadow-sm active:scale-[0.99]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-vincent text-lg font-bold text-white">V</span>
          Ik ben Vincent
        </button>
        <button
          name="person"
          value="marleen"
          className="flex h-20 items-center gap-4 rounded-2xl border border-line bg-surface px-5 text-left text-xl font-semibold shadow-sm active:scale-[0.99]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-marleen text-lg font-bold text-white">M</span>
          Ik ben Marleen
        </button>
      </form>
    </main>
  );
}
