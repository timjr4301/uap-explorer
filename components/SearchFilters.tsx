"use client";

import { Search, X, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import type { SearchFilters } from "@/lib/types";
import { AGENCIES, FILE_TYPES, EVIDENCE_TAGS, STATUSES } from "@/lib/types";

interface Props {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  totalCount: number;
}

const YEARS = Array.from({ length: 80 }, (_, i) => String(2024 - i));

export default function SearchFiltersPanel({ filters, onChange, totalCount }: Props) {
  const [expanded, setExpanded] = useState(false);

  function set(key: keyof SearchFilters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  function reset() {
    onChange({
      query: "",
      agency: "",
      status: "",
      fileType: "",
      evidenceTag: "",
      yearFrom: "",
      yearTo: "",
      country: "",
    });
  }

  const hasFilters =
    filters.query ||
    filters.agency ||
    filters.status ||
    filters.fileType ||
    filters.evidenceTag ||
    filters.yearFrom ||
    filters.yearTo ||
    filters.country;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search by title, location, agency, summary…"
          value={filters.query}
          onChange={(e) => set("query", e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none ring-0 transition focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
        />
        {filters.query && (
          <button
            onClick={() => set("query", "")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Toggle advanced filters */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {expanded ? "Hide filters" : "Show filters"}
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {totalCount} record{totalCount !== 1 ? "s" : ""}
          </span>
          {hasFilters && (
            <button
              onClick={reset}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter grid */}
      {expanded && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Agency */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Agency
              </label>
              <select
                value={filters.agency}
                onChange={(e) => set("agency", e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/50"
              >
                <option value="">All agencies</option>
                {AGENCIES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => set("status", e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/50"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* File type */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                File type
              </label>
              <select
                value={filters.fileType}
                onChange={(e) => set("fileType", e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/50"
              >
                <option value="">All types</option>
                {FILE_TYPES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Evidence type */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Evidence type
              </label>
              <select
                value={filters.evidenceTag}
                onChange={(e) => set("evidenceTag", e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/50"
              >
                <option value="">All evidence</option>
                {EVIDENCE_TAGS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Year from */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Released after
              </label>
              <select
                value={filters.yearFrom}
                onChange={(e) => set("yearFrom", e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/50"
              >
                <option value="">Any year</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Year to */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Released before
              </label>
              <select
                value={filters.yearTo}
                onChange={(e) => set("yearTo", e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/50"
              >
                <option value="">Any year</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Country */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Country
              </label>
              <select
                value={filters.country}
                onChange={(e) => set("country", e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/50"
              >
                <option value="">All countries</option>
                <option value="USA">United States</option>
                <option value="Chile">Chile</option>
                <option value="UK">United Kingdom</option>
                <option value="France">France</option>
                <option value="Belgium">Belgium</option>
              </select>
            </div>
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800 pt-3">
              {(
                [
                  ["agency", filters.agency],
                  ["status", filters.status],
                  ["file type", filters.fileType],
                  ["evidence", filters.evidenceTag],
                  ["from", filters.yearFrom],
                  ["to", filters.yearTo],
                  ["country", filters.country],
                ] as [string, string][]
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <span
                    key={k}
                    className="flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300 ring-1 ring-cyan-500/20"
                  >
                    <span className="text-cyan-500/60">{k}:</span> {v}
                  </span>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
