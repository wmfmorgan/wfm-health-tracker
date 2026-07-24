"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = { type?: "link"; href: string; label: string };

type NavGroup = {
  type: "group";
  label: string;
  children: NavLink[];
};

type NavItem = NavLink | NavGroup;

const NAV_ITEMS: NavItem[] = [
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
  {
    type: "group",
    label: "Copilot",
    children: [
      { href: "/chat", label: "Chat" },
      { href: "/brief", label: "Evaluation & Briefs" },
      { href: "/personas", label: "Personas" },
    ],
  },
  { href: "/settings", label: "Settings" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function linkClass(active: boolean, nested = false) {
  return `rounded-md text-sm transition-colors ${
    nested ? "px-2.5 py-1.5 pl-3" : "px-2.5 py-1.5"
  } ${
    active
      ? "bg-zinc-100 font-medium text-zinc-900"
      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
  }`;
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {NAV_ITEMS.map((item) => {
        if (item.type === "group") {
          const groupActive = item.children.some((c) =>
            isActive(pathname, c.href),
          );
          return (
            <div key={item.label} className="mt-1">
              <div
                className={`px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                  groupActive ? "text-zinc-800" : "text-zinc-500"
                }`}
              >
                {item.label}
              </div>
              <div
                className="ml-1.5 flex flex-col gap-0.5 border-l border-zinc-200 pl-1.5"
                role="group"
                aria-label={item.label}
              >
                {item.children.map((child) => {
                  const active = isActive(pathname, child.href);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={linkClass(active, true)}
                      aria-current={active ? "page" : undefined}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        }

        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={linkClass(active)}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
