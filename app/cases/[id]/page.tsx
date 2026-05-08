import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  MapPin,
  FileText,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  HelpCircle,
} from "lucide-react";
import { getCaseById, getCases } from "@/lib/supabase";
import Disclaimer from "@/components/Disclaimer";
import MediaViewer from "@/components/MediaViewer";
import CaseCard from "@/components/CaseCard";
import type { Case } from "@/lib/types";

export const revalidate = 3600;

function StatusIcon({ status }: { status: Case["status"] }) {
  switch (status) {
    case "resolved":   return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    case "unresolved": return <AlertCircle  className="h-4 w-4 text-red-400" />;
    case "ongoing":    return <Clock        className="h-4 w-4 text-amber-400" />;
    default:           return <HelpCircle   className="h-4 w-4 text-slate-400" />;
  }
}

function StatusBanner({ status }: { status: Case["status"] }) {
  const map: Record<string, { label: string; bg: string; text: string; border: string }> = {
    unresolved: { label: "Unresolved — no official explanation",      bg: "bg-red-500/5",     text: "text-red-400",     border: "border-red-500/20" },
    ongoing:    { label: "Under active investigation",                 bg: "bg-amber-500/5",   text: "text-amber-400",   border: "border-amber-500/20" },
    resolved:   { label: "Resolved — official explanation exists",     bg: "bg-emerald-500/5", text: "text-emerald-400", border: "border-emerald-500/20" },
    unknown:    { label: "Status unknown",                             bg: "bg-slate-500/5",   text: "text-slate-400",   border: "border-slate-500/20" },
  };
  const s = map[status] ?? map.unknown;
  return (
    <div className={`flex items-center gap-2 rounded-lg border ${s.border} ${s.bg} px-4 py-3`}>
      <StatusIcon status={status} />
      <span className={`text-sm font-medium ${s.text}`}>{s.label}</span>
    </div>
  );
}

export default async function CasePage({ params }: { params: { id: string } }) {
  const [c, relatedResult] = await Promise.all([
    getCaseById(params.id),
    getCases({}, 1, 6),
  ]);

  if (!c) notFound();

  const related = relatedResult.data.filter((r) => r.id !== c.id).slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── MEDIA VIEWER — full width, cinematic ── */}
      <div className="w-full bg-black">
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <Link
            href="/search"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to explorer
          </Link>

          {/* Title above viewer */}
          <h1 className="mb-4 text-xl font-bold leading-snug text-white sm:text-2xl">
            {c.title}
          </h1>

          {/* THE VIEWER */}
          <MediaViewer
            fileType={c.file_type}
            sourceUrl={c.source_url}
            title={c.title}
          />
        </div>
      </div>

      {/* ── METADATA PANEL ── */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-3">

          {/* LEFT — main info */}
          <div className="lg:col-span-2 space-y-5">

            {/* Status + meta row */}
            <div className="flex flex-wrap items-center gap-3">
              <StatusBanner status={c.status} />
              {c.classification_level && (
                <span className="flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-400">
                  <ShieldCheck className="h-3 w-3" />
                  {c.classification_level}
                </span>
              )}
              {c.file_type && (
                <span className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-400">
                  <FileText className="h-3 w-3" />
                  {c.file_type}
                </span>
              )}
            </div>

            {/* Summary */}
            {c.summary && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                <h2 className="mb-2 text-xs font-mono font-semibold uppercase tracking-widest text-cyan-400">
                  Plain-English Summary
                </h2>
                <p className="text-sm leading-relaxed text-slate-300">{c.summary}</p>
                <p className="mt-3 text-xs text-slate-600 italic">
                  AI-assisted summary — always verify with the original document.
                </p>
              </div>
            )}

            {/* Key claims */}
            {c.key_claims.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                <h2 className="mb-4 text-xs font-mono font-semibold uppercase tracking-widest text-cyan-400">
                  Key Claims
                </h2>
                <ul className="space-y-3">
                  {c.key_claims.map((claim, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                      {claim}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Evidence tags */}
            {c.evidence_tags.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                <h2 className="mb-3 text-xs font-mono font-semibold uppercase tracking-widest text-cyan-400">
                  Evidence Types
                </h2>
                <div className="flex flex-wrap gap-2">
                  {c.evidence_tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — sidebar details */}
          <div className="space-y-4">
            {/* Source link — prominent */}
            {c.source_url && (
              <a
                href={c.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/5 px-4 py-3 text-sm font-medium text-cyan-400 transition hover:bg-cyan-500/10"
              >
                <ExternalLink className="h-4 w-4" />
                View on war.gov
              </a>
            )}

            {/* Details card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-widest text-slate-500">
                Record Details
              </h3>

              {c.agency && (
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                  <div>
                    <p className="text-xs text-slate-600">Agency</p>
                    <p className="text-sm text-slate-300">{c.agency}</p>
                  </div>
                </div>
              )}

              {c.incident_location && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                  <div>
                    <p className="text-xs text-slate-600">Location</p>
                    <p className="text-sm text-slate-300">
                      {c.incident_location}
                      {c.incident_country ? ` · ${c.incident_country}` : ""}
                    </p>
                  </div>
                </div>
              )}

              {c.incident_date && (
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                  <div>
                    <p className="text-xs text-slate-600">Incident date</p>
                    <p className="text-sm text-slate-300">{c.incident_date}</p>
                  </div>
                </div>
              )}

              {c.release_date && (
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                  <div>
                    <p className="text-xs text-slate-600">Release date</p>
                    <p className="text-sm text-slate-300">{c.release_date}</p>
                  </div>
                </div>
              )}
            </div>

            <Disclaimer />
          </div>
        </div>

        {/* ── RELATED RECORDS ── */}
        {related.length > 0 && (
          <div className="mt-14">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">More Records</h2>
              <Link href="/search" className="text-sm text-cyan-400 hover:text-cyan-300 transition">
                Browse all →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => (
                <CaseCard key={r.id} c={r} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
