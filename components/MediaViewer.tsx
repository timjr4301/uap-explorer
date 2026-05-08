"use client";

import { useState } from "react";
import {
  ExternalLink,
  FileText,
  Video,
  Maximize2,
  Minimize2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface Props {
  fileType: string | null;
  sourceUrl: string | null;
  fileUrl?: string | null;
  title: string;
}

export default function MediaViewer({ fileType, sourceUrl, fileUrl, title }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const url = fileUrl ?? sourceUrl;
  if (!url) return null;

  const isVideo =
    fileType === "Video" ||
    url.match(/\.(mp4|mov|avi|webm|wmv)(\?.*)?$/i);

  const isPdf =
    fileType === "PDF" ||
    fileType === "Report" ||
    url.match(/\.pdf(\?.*)?$/i);

  // Google Docs viewer wraps the PDF so it works even if war.gov blocks direct iframes
  const pdfEmbedUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  if (isVideo) {
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-black">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Video className="h-4 w-4 text-cyan-400" />
            <span>Video — {title}</span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-cyan-400 transition"
          >
            Open original <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <video
          src={url}
          controls
          className="w-full max-h-[70vh] bg-black"
          poster=""
          onError={() => setFailed(true)}
        >
          Your browser does not support this video.
        </video>
        {failed && <EmbedFallback url={url} type="video" />}
      </section>
    );
  }

  if (isPdf) {
    return (
      <section
        className={`overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 transition-all duration-300 ${
          expanded ? "fixed inset-4 z-50 shadow-2xl" : "relative"
        }`}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <FileText className="h-4 w-4 text-cyan-400" />
            <span className="truncate max-w-xs">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-cyan-400 transition"
            >
              Open original <ExternalLink className="h-3 w-3" />
            </a>
            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition"
              title={expanded ? "Exit fullscreen" : "Fullscreen"}
            >
              {expanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Loading overlay */}
        {loading && !failed && (
          <div className="absolute inset-0 top-12 flex flex-col items-center justify-center bg-slate-950 gap-3 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500/40" />
            <p className="text-xs text-slate-600">Loading document…</p>
          </div>
        )}

        {/* PDF iframe */}
        {!failed ? (
          <iframe
            src={pdfEmbedUrl}
            title={title}
            className={`w-full border-0 transition-all ${
              expanded ? "h-[calc(100vh-8rem)]" : "h-[75vh]"
            }`}
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setFailed(true); }}
          />
        ) : (
          <EmbedFallback url={url} type="pdf" />
        )}

        {/* Backdrop for fullscreen */}
        {expanded && (
          <div
            className="fixed inset-0 -z-10 bg-black/80 backdrop-blur-sm"
            onClick={() => setExpanded(false)}
          />
        )}
      </section>
    );
  }

  // Generic document link for other types
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-5 py-4 text-sm text-slate-300 hover:border-cyan-500/30 hover:text-white transition"
    >
      <FileText className="h-5 w-5 text-cyan-400 shrink-0" />
      <span>View original document on war.gov</span>
      <ExternalLink className="h-4 w-4 ml-auto shrink-0 text-slate-600" />
    </a>
  );
}

function EmbedFallback({ url, type }: { url: string; type: "pdf" | "video" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/5">
        <AlertCircle className="h-6 w-6 text-amber-400" />
      </div>
      <div>
        <p className="font-medium text-white">
          {type === "pdf" ? "PDF" : "Video"} couldn't load inline
        </p>
        <p className="mt-1 text-sm text-slate-500">
          The government server may block embedded viewing.
        </p>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition"
      >
        <ExternalLink className="h-4 w-4" />
        Open on war.gov directly
      </a>
    </div>
  );
}
