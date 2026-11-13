import { BottomNav, TopNav } from "@/components/BottomNav";
import { requirePerson } from "@/lib/session";
import { ServiceWorker } from "@/components/ServiceWorker";
import { AvatarProvider } from "@/components/Avatars";
import { BackToTop } from "@/components/BackToTop";
import { LiveSync } from "@/components/LiveSync";
import { ViewportFix } from "@/components/ViewportFix";
import { OfflineStatus } from "@/components/OfflineStatus";
import { ScreenProbe } from "@/components/ScreenProbe";
import { getAvatarUrls } from "@/lib/people";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requirePerson();
  const avatars = await getAvatarUrls();
  return (
    <AvatarProvider urls={avatars}>
      {/*
        Vlak achter de statusbalk (iPhone-app op beginscherm). iOS laat het scherm van de app onder de statusbalk
        beginnen (geen veilige marge, env = 0), maar tekent gescrolde inhoud tóch boven die rand, achter de klok.
        Daarom staat dit vlak bóven de bovenrand (top: -120px) en loopt het door tot de eventuele veilige marge.
      */}
      <div aria-hidden data-statusvlak className="fixed inset-x-0 top-[-120px] z-40 h-[calc(120px+env(safe-area-inset-top))] bg-bg" />
      <ScreenProbe />
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
