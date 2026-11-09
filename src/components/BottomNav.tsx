"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconEye, IconList, IconReceipt, IconSettings, IconStar } from "./icons";

const items = [
  { href: "/", label: "Lijst", Icon: IconList },
  { href: "/vast", label: "Vast", Icon: IconStar },
  { href: "/watchlist", label: "Watchlist", Icon: IconEye },
  { href: "/bonnen", label: "Bonnen", Icon: IconReceipt },
  { href: "/beheer", label: "Beheer", Icon: IconSettings },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur safe-bottom">
      <ul className="mx-auto grid max-w-2xl grid-cols-5">
        {items.map(({ href, label, Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
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
