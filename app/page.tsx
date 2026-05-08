import Link from "next/link";
import { ExternalLink, Search, Play } from "lucide-react";
import { supabase, getStats } from "@/lib/supabase";
import CategoryRow from "@/components/CategoryRow";
import Disclaimer from "@/components/Disclaimer";
import type { Case } from "@/lib/types";

export const revalidate = 3600;

async function getCasesByFilter(filter: Record<string, unknown>, limit = 10): Promise<Case[]> {
  let q = supabase.from("cases").select("*").order("release_date", { ascending: false, nullsFirst: false }).limit(limit);
  for (const [key, val] of Object.entries(filter)) {
    if (Array.isArray(val)) {
      q = q.contains(key, val);
    } else {
      q = (q as ReturnType<typeof q.eq>).eq(key, val);
    }
  }
  const { data } = await q;
  return (data as Case[]) ?? [];
}

export default async function HomePage() {
  const [
    stats,
    featured,
    videos,
    pdfs,
    unresolved,
    aaro,
  ] = await Promise.all([
    getStats(),
    getCasesByFilter({ featured: true }, 10),
    getCasesByFilter({ file_type: "Video" }, 10),
    getCasesByFilter({ file_type: "PDF" }, 10),
    getCasesByFilter({ status: "unresolved" }, 10),
    getCasesByFilter({ agency: "AARO (All-domain Anomaly Resolution Office)" }, 10),
  ]);

  // Pick the top featured case for the hero
  const hero = featured[0] ?? unresolved[0];

  return (
    <div className="min-h-screen bg-slate-950">

      {/* ══ HERO ══════════════════════════════════════════════════ */}
      <section className="relative min-h-[70vh] flex items-end overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(6,182,212,0.08),_transparent_60%)]" />

        {/* Scan-line texture */}
        <div className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,255,0.03) 2px,rgba(0,255,255,0.03) 4px)"
          }}
        />

        {/* Floating orbs */}
        <div className="absolute top-20 right-1/4 h-64 w-64 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/3 h-40 w-40 rounded-full bg-blue-500/5 blur-2xl pointer-events-none" />

        <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-24 sm:px-6">
          <div className="max-w-2xl">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Official declassified records — independent research tool
            </span>

            <h1 className="mt-3 text-5xl font-bold tracking-tight text-white sm:text-7xl">
              UAP<span className="text-cyan-400">Explorer</span>
            </h1>

            <p className="mt-5 text-lg text-slate-400 leading-relaxed max-w-xl">
              Every officially released U.S. government UAP document in one place.
              Watch the videos. Read the reports. Understand what the government
              actually released — without the confusion.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-7 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400 active:scale-95"
              >
                <Search className="h-4 w-4" />
                Browse all records
              </Link>

              {hero && (
                <Link
                  href={`/cases/${hero.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/60 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-slate-700 active:scale-95"
                >
                  <Play className="h-4 w-4 text-cyan-400" />
                  {hero.file_type === "Video" ? "Watch" : "Read"} featured record
                </Link>
              )}

              <a
                href="https://www.war.gov/UFO/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3.5 text-sm text-slate-400 transition hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
                Primary source
              </a>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mt-14 flex flex-wrap gap-6">
            {[
              { label: "Total records", value: stats.total },
              { label: "Unresolved cases", value: stats.unresolved },
              { label: "Government agencies", value: stats.agencies },
              { label: "Video files", value: videos.length },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-bold text-white">{value}</p>
                <p className="mt-0.5 text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CONTENT ROWS — Netflix style ═══════════════════════════ */}
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-12 sm:px-6">

        {videos.length > 0 && (
          <CategoryRow
            title="📹  Video Files"
            cases={videos}
            viewAllHref="/search?type=Video"
          />
        )}

        {featured.length > 0 && (
          <CategoryRow
            title="⭐  Featured Records"
            cases={featured}
            viewAllHref="/search"
          />
        )}

        {unresolved.length > 0 && (
          <CategoryRow
            title="🔴  Unresolved Cases"
            cases={unresolved}
            viewAllHref="/search?status=unresolved"
          />
        )}

        {pdfs.length > 0 && (
          <CategoryRow
            title="📄  Declassified Documents"
            cases={pdfs}
            viewAllHref="/search?type=PDF"
          />
        )}

        {aaro.length > 0 && (
          <CategoryRow
            title="🛡️  AARO Releases"
            cases={aaro}
            viewAllHref="/search?agency=AARO+%28All-domain+Anomaly+Resolution+Office%29"
          />
        )}

        <Disclaimer />
      </div>
    </div>
  );
}
