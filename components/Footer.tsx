import { ExternalLink } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-cyan-400">
              UAP Explorer
            </p>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              An independent research tool for browsing officially declassified
              UAP/UFO government documents. Not affiliated with any U.S.
              government agency.
            </p>
          </div>
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-slate-400">
              Primary Source
            </p>
            <a
              href="https://www.war.gov/UFO/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center gap-1 text-xs text-slate-500 hover:text-cyan-400 transition"
            >
              war.gov/UFO <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://www.aaro.mil/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 flex items-center gap-1 text-xs text-slate-500 hover:text-cyan-400 transition"
            >
              AARO Official Site <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-slate-400">
              Disclaimer
            </p>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              All documents link back to their original government source. AI
              summaries are for research assistance only — always read the
              primary source. Status labels reflect current public knowledge and
              may change.
            </p>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-slate-700">
          © {new Date().getFullYear()} UAP Explorer · Independent research
          tool · Not affiliated with the U.S. government
        </p>
      </div>
    </footer>
  );
}
