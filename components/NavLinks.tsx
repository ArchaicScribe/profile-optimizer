"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ScanSearch, FileSearch, BookOpen, Settings, PenLine, MessageSquare, Building2 } from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/audit", label: "Audit", icon: FileSearch },
  { href: "/rewrite", label: "Rewrite", icon: PenLine },
  { href: "/jobs", label: "Jobs", icon: ScanSearch },
  { href: "/prep", label: "Prep", icon: BookOpen },
  { href: "/mock", label: "Mock", icon: MessageSquare },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1">
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
          >
            <Icon size={14} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
