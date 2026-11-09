import { BottomNav } from "@/components/BottomNav";
import { requirePerson } from "@/lib/session";
import { ServiceWorker } from "@/components/ServiceWorker";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requirePerson();
  return (
    <>
      <main className="mx-auto w-full max-w-2xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-nav">{children}</main>
      <BottomNav />
      <ServiceWorker />
    </>
  );
}
