"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconEye, IconList, IconReceipt, IconSettings, IconStar } from "./icons";

const items = [
  { href: "/", label: "Lijst", Icon: IconList },
  { href: "/vast", label: "Vast", Icon: IconStar },
  { href: "/watchlist", label: "Watchlist", Icon: IconEye },
  { href: "/bonnen", label: "Bonnen", Icon: IconReceipt, also: ["/dashboard"] },
  { href: "/beheer", label: "Beheer", Icon: IconSettings },
];

function isActive(path: string, href: string, also: string[] = []) {
  if (href === "/") return path === "/";
  return path.startsWith(href) || also.some((a) => path.startsWith(a));
}

/** Telefoon: menubalk onderaan. */
export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Menu" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur safe-bottom md:hidden">
      <ul className="mx-auto grid max-w-2xl grid-cols-5">
        {items.map(({ href, label, Icon, also }) => {
          const active = isActive(path, href, also);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <Icon className="h-6 w-6" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Tablet en laptop: menubalk bovenaan. */
export function TopNav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-20 hidden border-b border-line bg-surface/95 backdrop-blur md:block">
      <nav aria-label="Menu" className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-4">
        <Link href="/" className="mr-auto text-lg font-semibold tracking-tight text-accent">
          Boodschappen
        </Link>
        {items.map(({ href, label, Icon, also }) => {
          const active = isActive(path, href, also);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold ${
                active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
