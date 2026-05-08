import { ShieldAlert } from "lucide-react";

export default function Disclaimer() {
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200/70 flex gap-3 items-start">
      <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0 text-amber-400/60" />
      <p>
        <strong className="text-amber-300/80">Independent research tool.</strong>{" "}
        UAP Explorer is not affiliated with the U.S. government or any agency.
        All documents listed here are sourced from official public government
        releases. AI-generated summaries are for context only — always refer
        to the original source document before drawing conclusions.
      </p>
    </div>
  );
}
