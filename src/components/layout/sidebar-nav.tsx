"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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

function NavGroupItem({
  item,
  pathname,
}: {
  item: NavGroup;
  pathname: string;
}) {
  const groupActive = item.children.some((c) => isActive(pathname, c.href));
  const [open, setOpen] = useState(groupActive);

  // Keep expanded when navigating into a child route
  useEffect(() => {
    if (groupActive) setOpen(true);
  }, [groupActive]);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm font-medium transition-colors ${
          groupActive
            ? "text-zinc-900 hover:bg-zinc-50"
            : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
        }`}
      >
        <span>{item.label}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${
            open ? "rotate-90" : ""
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
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
      ) : null}
    </div>
  );
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {NAV_ITEMS.map((item) => {
        if (item.type === "group") {
          return (
            <NavGroupItem key={item.label} item={item} pathname={pathname} />
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
