"use client";

import Link from "next/link";
import { ExternalLink, Calendar, MapPin } from "lucide-react";
import type { Case } from "@/lib/types";
import CaseThumbnail from "./CaseThumbnail";

function StatusBadge({ status }: { status: Case["status"] }) {
  const styles: Record<string, string> = {
    unresolved: "bg-red-500/10 text-red-400 ring-red-500/20",
    ongoing:    "bg-amber-500/10 text-amber-400 ring-amber-500/20",
    resolved:   "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    unknown:    "bg-slate-500/10 text-slate-400 ring-slate-500/20",
  };
  const labels: Record<string, string> = {
    unresolved: "Unresolved",
    ongoing:    "Under Investigation",
    resolved:   "Resolved",
    unknown:    "Unknown",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${styles[status] ?? styles.unknown}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default function CaseCard({ c }: { c: Case }) {
  return (
    <article className="group relative flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden transition hover:border-cyan-500/30 hover:bg-slate-900 hover:shadow-xl hover:shadow-cyan-500/5">

      {/* Thumbnail — 16:9 */}
      <Link href={`/cases/${c.id}`} className="block aspect-video w-full shrink-0">
        <CaseThumbnail c={c} className="h-full w-full" />
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">

        {/* Agency + status row */}
        <div className="mb-2 flex items-center justify-between gap-2">
          {c.agency && (
            <p className="truncate text-xs font-medium text-cyan-400/70">{c.agency}</p>
          )}
          <StatusBadge status={c.status} />
        </div>

        {/* Title */}
        <h3 className="mb-2 font-semibold leading-snug text-white text-sm group-hover:text-cyan-100 transition line-clamp-2">
          <Link href={`/cases/${c.id}`} className="before:absolute before:inset-0">
            {c.title}
          </Link>
        </h3>

        {/* Meta */}
        <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          {c.incident_location && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              {c.incident_location}
            </span>
          )}
          {c.release_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 shrink-0" />
              {c.release_date.slice(0, 4)}
            </span>
          )}
        </div>

        {/* Summary snippet */}
        {c.summary && (
          <p className="mb-3 text-xs text-slate-400 leading-relaxed line-clamp-2">
            {c.summary}
          </p>
        )}

        {/* Evidence tags */}
        {c.evidence_tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {c.evidence_tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-500">
                {tag}
              </span>
            ))}
            {c.evidence_tags.length > 3 && (
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-600">
                +{c.evidence_tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-slate-800 pt-3">
          <Link
            href={`/cases/${c.id}`}
            className="relative z-10 text-xs text-slate-400 hover:text-cyan-400 transition"
          >
            {c.file_type === "Video" ? "▶ Watch" : "Read record"} →
          </Link>
          {c.source_url && (
            <a
              href={c.source_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 flex items-center gap-1 text-xs text-slate-600 hover:text-cyan-400 transition"
            >
              Source <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
