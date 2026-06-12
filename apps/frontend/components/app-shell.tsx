"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Brain,
  Cable,
  Database,
  FileText,
  Hammer,
  MessageSquare,
  Settings,
  ShieldCheck,
  Sparkles
} from "lucide-react";

const nav = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/tools", label: "Tools", icon: Hammer },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/knowledge", label: "Knowledge", icon: FileText },
  { href: "/skills", label: "Skills", icon: Sparkles },
  { href: "/mcp", label: "MCP", icon: Cable },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin", label: "Admin", icon: ShieldCheck }
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="border-b border-border bg-white lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Database size={18} aria-hidden />
          </div>
          <div>
            <div className="text-sm font-semibold">OpenAgent Hub</div>
            <div className="text-xs text-muted-foreground">Self-hosted workspace</div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-3 lg:block">
          {nav.map((item) => {
            const active = pathname === item.href || (pathname === "/" && item.href === "/chat");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition ${
                  active ? "bg-primary text-primary-foreground" : "text-slate-700 hover:bg-muted"
                }`}
              >
                <Icon size={17} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
