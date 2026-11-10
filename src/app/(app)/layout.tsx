import { BottomNav, TopNav } from "@/components/BottomNav";
import { requirePerson } from "@/lib/session";
import { ServiceWorker } from "@/components/ServiceWorker";
import { AvatarProvider } from "@/components/Avatars";
import { BackToTop } from "@/components/BackToTop";
import { getAvatarUrls } from "@/lib/people";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requirePerson();
  const avatars = await getAvatarUrls();
  return (
    <AvatarProvider urls={avatars}>
      <TopNav />
      <main className="mx-auto w-full max-w-3xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-nav md:pt-6 md:pb-12">{children}</main>
      <BottomNav />
      <BackToTop />
      <ServiceWorker />
    </AvatarProvider>
  );
}
