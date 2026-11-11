"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: [string, string][] = [
  ["/admin", "Übersicht"],
  ["/admin/seasons", "Partien"],
  ["/admin/users", "Nutzer & Zugänge"],
  ["/admin/codes", "Zugangscodes"],
  ["/admin/universes", "Universen"],
  ["/admin/audit", "Protokoll"],
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="adminnav">
      {ITEMS.map(([href, label]) => (
        <Link key={href} href={href} className={path === href ? "on" : ""} aria-current={path === href ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
