import Link from "next/link";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="-ml-1 inline-flex h-10 items-center gap-1 px-1 text-[15px] font-medium text-accent">
      <span aria-hidden className="text-xl leading-none">‹</span> {label}
    </Link>
  );
}
