import { BottomNav, TopNav } from "@/components/BottomNav";
import { requirePerson } from "@/lib/session";
import { ServiceWorker } from "@/components/ServiceWorker";
import { AvatarProvider } from "@/components/Avatars";
import { BackToTop } from "@/components/BackToTop";
import { LiveSync } from "@/components/LiveSync";
import { ViewportFix } from "@/components/ViewportFix";
import { OfflineStatus } from "@/components/OfflineStatus";
import { getAvatarUrls } from "@/lib/people";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requirePerson();
  const avatars = await getAvatarUrls();
  return (
    <AvatarProvider urls={avatars}>
      {/* Vlak achter de statusbalk (iPhone-app op beginscherm): inhoud schuift er niet meer onderdoor */}
      <div aria-hidden className="fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] bg-bg" />
      <TopNav />
      <main className="mx-auto w-full max-w-3xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-nav md:pt-6 md:pb-12">{children}</main>
      <BottomNav />
      <BackToTop />
      <LiveSync />
      <ViewportFix />
      <OfflineStatus />
      <ServiceWorker />
    </AvatarProvider>
  );
}
