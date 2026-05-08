export type CaseStatus = "resolved" | "unresolved" | "ongoing" | "unknown";

export interface Case {
  id: string;
  title: string;
  slug: string | null;
  agency: string | null;
  release_date: string | null;
  incident_date: string | null;
  incident_location: string | null;
  incident_country: string | null;
  file_type: string | null;
  source_url: string | null;
  page_count: number | null;
  summary: string | null;
  key_claims: string[];
  evidence_tags: string[];
  status: CaseStatus;
  classification_level: string | null;
  thumbnail_url: string | null;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface SearchFilters {
  query: string;
  agency: string;
  status: string;
  fileType: string;
  evidenceTag: string;
  yearFrom: string;
  yearTo: string;
  country: string;
}

export const AGENCIES = [
  "AARO (All-domain Anomaly Resolution Office)",
  "CIA",
  "DIA / Pentagon",
  "DoD / AARO",
  "FAA / FOIA",
  "ODNI / USD(I&S)",
  "Pentagon / AARO",
  "USAF / FOIA",
  "Chilean Navy / CEFAA",
] as const;

export const FILE_TYPES = ["PDF", "Video", "Report", "Image", "Audio"] as const;

export const EVIDENCE_TAGS = [
  "radar",
  "infrared/FLIR",
  "video",
  "pilot testimony",
  "witness testimony",
  "multi-sensor",
  "official report",
  "government document",
  "FOIA",
  "historical analysis",
  "whistleblower",
  "congressional record",
  "foreign government",
  "classified program",
  "military incident",
] as const;

export const STATUSES: { value: CaseStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "unresolved", label: "Unresolved" },
  { value: "ongoing", label: "Ongoing investigation" },
  { value: "resolved", label: "Resolved" },
  { value: "unknown", label: "Unknown" },
];
