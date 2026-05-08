"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import CaseCard from "./CaseCard";
import type { Case } from "@/lib/types";
import Link from "next/link";

interface Props {
  title: string;
  cases: Case[];
  viewAllHref?: string;
}

export default function CategoryRow({ title, cases, viewAllHref }: Props) {
  const rowRef = useRef<HTMLDivElement>(null);

  function scroll(dir: "left" | "right") {
    if (!rowRef.current) return;
    const amount = rowRef.current.clientWidth * 0.75;
    rowRef.current.scrollBy({ left: dir === "right" ? amount : -amount, behavior: "smooth" });
  }

  if (cases.length === 0) return null;

  return (
    <section className="relative">
      {/* Row header */}
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-base font-semibold text-white sm:text-lg">{title}</h2>
        <div className="flex items-center gap-3">
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition"
            >
              See all →
            </Link>
          )}
          <div className="flex gap-1">
            <button
              onClick={() => scroll("left")}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable row */}
      <div
        ref={rowRef}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {cases.map((c) => (
          <div key={c.id} className="w-80 shrink-0">
            <CaseCard c={c} />
          </div>
        ))}
      </div>
    </section>
  );
}
