"use client";

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useTransition,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import CaseCard from "@/components/CaseCard";
import SearchFiltersPanel from "@/components/SearchFilters";
import Disclaimer from "@/components/Disclaimer";
import type { Case, SearchFilters } from "@/lib/types";
import { ChevronLeft, ChevronRight, Loader2, Share2, Check } from "lucide-react";
import { Suspense, useState } from "react";

const PAGE_SIZE = 12;

const DEFAULT_FILTERS: SearchFilters = {
  query: "",
  agency: "",
  status: "",
  fileType: "",
  evidenceTag: "",
  yearFrom: "",
  yearTo: "",
  country: "",
};

// ─── State management ────────────────────────────────────────────────────────

type State = {
  cases: Case[];
  total: number;
  page: number;
  loading: boolean;
  filters: SearchFilters;
};

type Action =
  | { type: "SET_FILTERS"; filters: SearchFilters }
  | { type: "SET_PAGE"; page: number }
  | { type: "FETCH_START" }
  | { type: "FETCH_DONE"; cases: Case[]; total: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_FILTERS":
      return { ...state, filters: action.filters, page: 1 };
    case "SET_PAGE":
      return { ...state, page: action.page };
    case "FETCH_START":
      return { ...state, loading: true };
    case "FETCH_DONE":
      return { ...state, loading: false, cases: action.cases, total: action.total };
  }
}

// ─── Main inner component (uses useSearchParams) ──────────────────────────────

function SearchPageInner() {
  const router     = useRouter();
  const pathname   = usePathname();
  const sp         = useSearchParams();
  const [, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  // Initialise filters from URL query params so links are shareable
  function filtersFromParams(): SearchFilters {
    return {
      query:       sp.get("q")          ?? "",
      agency:      sp.get("agency")     ?? "",
      status:      sp.get("status")     ?? "",
      fileType:    sp.get("type")       ?? "",
      evidenceTag: sp.get("evidence")   ?? "",
      yearFrom:    sp.get("from")       ?? "",
      yearTo:      sp.get("to")         ?? "",
      country:     sp.get("country")    ?? "",
    };
  }

  const [state, dispatch] = useReducer(reducer, {
    cases:   [],
    total:   0,
    page:    Number(sp.get("page") ?? 1),
    loading: true,
    filters: filtersFromParams(),
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Sync filters → URL ──
  function pushUrl(f: SearchFilters, page: number) {
    const p = new URLSearchParams();
    if (f.query)       p.set("q",        f.query);
    if (f.agency)      p.set("agency",   f.agency);
    if (f.status)      p.set("status",   f.status);
    if (f.fileType)    p.set("type",     f.fileType);
    if (f.evidenceTag) p.set("evidence", f.evidenceTag);
    if (f.yearFrom)    p.set("from",     f.yearFrom);
    if (f.yearTo)      p.set("to",       f.yearTo);
    if (f.country)     p.set("country",  f.country);
    if (page > 1)      p.set("page",     String(page));
    const qs = p.toString();
    startTransition(() => {
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    });
  }

  // ── Fetch from API ──
  const fetchCases = useCallback(async (f: SearchFilters, page: number) => {
    dispatch({ type: "FETCH_START" });
    try {
      const params = new URLSearchParams({
        query:       f.query,
        agency:      f.agency,
        status:      f.status,
        fileType:    f.fileType,
        evidenceTag: f.evidenceTag,
        yearFrom:    f.yearFrom,
        yearTo:      f.yearTo,
        country:     f.country,
        page:        String(page),
        pageSize:    String(PAGE_SIZE),
      });
      const res  = await fetch(`/api/cases?${params}`);
      const json = await res.json();
      dispatch({ type: "FETCH_DONE", cases: json.data ?? [], total: json.count ?? 0 });
    } catch {
      dispatch({ type: "FETCH_DONE", cases: [], total: 0 });
    }
  }, []);

  // ── Debounce text search; instant for dropdowns ──
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const delay = state.filters.query ? 350 : 0;
    debounceRef.current = setTimeout(() => {
      fetchCases(state.filters, state.page);
      pushUrl(state.filters, state.page);
    }, delay);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.filters, state.page]);

  function handleFilterChange(filters: SearchFilters) {
    dispatch({ type: "SET_FILTERS", filters });
  }

  function handlePageChange(page: number) {
    dispatch({ type: "SET_PAGE", page });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function copyShareUrl() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const totalPages = Math.ceil(state.total / PAGE_SIZE);

  // Build visible page numbers (always show first, last, and ±2 around current)
  function pageNumbers(): (number | "…")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "…")[] = [1];
    if (state.page > 3) pages.push("…");
    for (let p = Math.max(2, state.page - 1); p <= Math.min(totalPages - 1, state.page + 1); p++) {
      pages.push(p);
    }
    if (state.page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
    return pages;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Page header */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Document Explorer
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse and filter all officially released UAP/UFO government records.
            Every result links to its original government source.
          </p>
        </div>

        {/* Share button */}
        <button
          onClick={copyShareUrl}
          title="Copy shareable link to these filters"
          className="hidden sm:flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 transition hover:border-slate-500 hover:text-white"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5" />
              Share filters
            </>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="mb-8">
        <SearchFiltersPanel
          filters={state.filters}
          onChange={handleFilterChange}
          totalCount={state.total}
        />
      </div>

      {/* Results grid */}
      {state.loading ? (
        <div className="flex items-center justify-center py-28">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-cyan-500/50" />
            <span className="text-xs text-slate-600">Searching…</span>
          </div>
        </div>
      ) : state.cases.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {state.cases.map((c) => (
              <CaseCard key={c.id} c={c} />
            ))}
          </div>

          {/* Result count + pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex flex-col items-center gap-4">
              <p className="text-xs text-slate-600">
                Showing {(state.page - 1) * PAGE_SIZE + 1}–
                {Math.min(state.page * PAGE_SIZE, state.total)} of {state.total} records
              </p>

              <div className="flex items-center gap-1.5">
                <PaginationBtn
                  onClick={() => handlePageChange(state.page - 1)}
                  disabled={state.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </PaginationBtn>

                {pageNumbers().map((p, i) =>
                  p === "…" ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-slate-600">…</span>
                  ) : (
                    <PaginationBtn
                      key={p}
                      onClick={() => handlePageChange(p as number)}
                      active={state.page === p}
                    >
                      {p}
                    </PaginationBtn>
                  )
                )}

                <PaginationBtn
                  onClick={() => handlePageChange(state.page + 1)}
                  disabled={state.page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </PaginationBtn>
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-14">
        <Disclaimer />
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/30 py-28 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-slate-700 bg-slate-800">
        <span className="text-2xl">📡</span>
      </div>
      <p className="text-lg font-semibold text-white">No records found</p>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Try broadening your search — clear a filter or use fewer keywords.
      </p>
    </div>
  );
}

function PaginationBtn({
  children,
  onClick,
  disabled = false,
  active = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border px-2.5 text-sm transition ${
        active
          ? "border-cyan-500 bg-cyan-500/10 text-cyan-400 font-medium"
          : disabled
          ? "border-slate-800 text-slate-700 cursor-not-allowed"
          : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Export (wrapped in Suspense for useSearchParams) ─────────────────────────

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-40">
          <Loader2 className="h-7 w-7 animate-spin text-cyan-500/40" />
        </div>
      }
    >
      <SearchPageInner />
    </Suspense>
  );
}
