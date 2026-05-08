"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar } from "lucide-react";

export default function Header() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/search", label: "Document Explorer" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/10 ring-1 ring-cyan-500/30 transition group-hover:bg-cyan-500/20">
            <Radar className="h-4 w-4 text-cyan-400" />
          </span>
          <span className="font-mono text-sm font-semibold tracking-wide text-white">
            UAP<span className="text-cyan-400">Explorer</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded px-3 py-1.5 text-sm transition ${
                pathname === link.href
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://www.war.gov/UFO/"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400 transition"
          >
            war.gov/UFO ↗
          </a>
        </nav>
      </div>
    </header>
  );
}
