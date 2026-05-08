"use client";

import { useState } from "react";
import { FileText, Video, Image, File, Radio } from "lucide-react";
import type { Case } from "@/lib/types";

interface Props {
  c: Case;
  className?: string;
}

// Styled placeholder when no real thumbnail exists
function Placeholder({ fileType, status }: { fileType: string | null; status: Case["status"] }) {
  const gradients: Record<string, string> = {
    Video:   "from-cyan-950  to-slate-900",
    PDF:     "from-blue-950  to-slate-900",
    Report:  "from-indigo-950 to-slate-900",
    Image:   "from-purple-950 to-slate-900",
    Audio:   "from-violet-950 to-slate-900",
  };

  const glows: Record<string, string> = {
    Video:   "bg-cyan-500/10",
    PDF:     "bg-blue-500/10",
    Report:  "bg-indigo-500/10",
    Image:   "bg-purple-500/10",
    Audio:   "bg-violet-500/10",
  };

  const icons: Record<string, React.ReactNode> = {
    Video:   <Video  className="h-8 w-8 text-cyan-400/60" />,
    PDF:     <FileText className="h-8 w-8 text-blue-400/60" />,
    Report:  <FileText className="h-8 w-8 text-indigo-400/60" />,
    Image:   <Image  className="h-8 w-8 text-purple-400/60" />,
    Audio:   <Radio  className="h-8 w-8 text-violet-400/60" />,
  };

  const statusDot: Record<string, string> = {
    unresolved: "bg-red-400",
    ongoing:    "bg-amber-400",
    resolved:   "bg-emerald-400",
    unknown:    "bg-slate-500",
  };

  const type = fileType ?? "PDF";
  const gradient = gradients[type] ?? "from-slate-900 to-slate-950";
  const glow     = glows[type]     ?? "bg-slate-500/10";
  const icon     = icons[type]     ?? <File className="h-8 w-8 text-slate-400/60" />;

  return (
    <div className={`relative flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient} overflow-hidden`}>
      {/* Scan lines */}
      <div className="absolute inset-0 opacity-20"
        style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.03) 3px,rgba(255,255,255,0.03) 4px)" }}
      />

      {/* Radial glow */}
      <div className={`absolute h-24 w-24 rounded-full blur-2xl ${glow}`} />

      {/* Icon */}
      <div className="relative flex flex-col items-center gap-2">
        {icon}
        <span className="text-xs font-mono text-slate-600 uppercase tracking-widest">
          {type}
        </span>
      </div>

      {/* Status dot */}
      <span className={`absolute bottom-2 right-2 h-2 w-2 rounded-full ${statusDot[status] ?? statusDot.unknown} shadow-lg`} />

      {/* UAP Explorer watermark */}
      <span className="absolute bottom-2 left-2 font-mono text-[9px] text-slate-700 tracking-widest uppercase">
        UAP Explorer
      </span>
    </div>
  );
}

export default function CaseThumbnail({ c, className = "" }: Props) {
  const [imgError, setImgError] = useState(false);

  const showReal = c.thumbnail_url && !imgError;

  return (
    <div className={`relative overflow-hidden bg-slate-900 ${className}`}>
      {showReal ? (
        <img
          src={c.thumbnail_url!}
          alt={c.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setImgError(true)}
        />
      ) : (
        <Placeholder fileType={c.file_type} status={c.status} />
      )}

      {/* Video play overlay */}
      {c.file_type === "Video" && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm ring-1 ring-white/20">
            <Video className="h-5 w-5 text-white ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
}
