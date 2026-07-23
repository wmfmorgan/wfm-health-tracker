"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/profile", label: "Profile" },
  { href: "/providers", label: "Providers" },
  { href: "/diagnoses", label: "Diagnoses" },
  { href: "/medications", label: "Medications" },
  { href: "/supplements", label: "Supplements" },
  { href: "/labs", label: "Labs" },
  { href: "/analytes", label: "Analytes" },
  { href: "/tests", label: "Tests" },
  { href: "/procedures", label: "Procedures" },
  { href: "/import", label: "Import" },
  { href: "/documents", label: "Documents" },
  { href: "/brief", label: "Brief" },
  { href: "/co-pilot", label: "Co-pilot" },
  { href: "/settings", label: "Settings" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-2.5 py-1.5 text-sm transition-colors ${
              active
                ? "bg-zinc-100 font-medium text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
