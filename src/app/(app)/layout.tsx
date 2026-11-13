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
      {/*
        Vervaging bovenin (zoals in de Claude-app). iOS laat het scherm onder de klok beginnen en tekent wat je
        wegscrolt zelf, vaag, achter de klok; daar kan de app niets overheen leggen. Deze overgang van achtergrondkleur
        naar doorzichtig laat de inhoud al vervagen vóór hij onder de klok verdwijnt.
      */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-30 h-[calc(1.75rem+env(safe-area-inset-top))] bg-gradient-to-b from-bg via-bg/80 to-transparent md:hidden"
      />
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
