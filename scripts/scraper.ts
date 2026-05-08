/**
 * UAP Explorer — war.gov/UFO Scraper
 *
 * Crawls https://www.war.gov/UFO/, extracts document metadata,
 * and upserts records into Supabase.
 *
 * Usage:
 *   npm run scrape          — live run (writes to database)
 *   npm run scrape:dry      — dry run (prints records, no writes)
 *
 * Features:
 *   • Polite rate-limiting: configurable delay between every request
 *   • Exponential backoff on HTTP errors (3 retries)
 *   • Deduplication via SHA-256 hash of the source URL
 *   • Checkpoint file: resumes from where it left off on crash
 *   • Audit log written to Supabase scrape_log table
 *   • Queue written to Supabase scrape_queue table
 */

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

// ─── Lazy-load ESM-only packages ────────────────────────────────────────────
// cheerio v1 and node-fetch v3 are ESM-only; we use dynamic import.
async function loadDeps() {
  const [{ load }, { default: fetch }] = await Promise.all([
    import("cheerio"),
    import("node-fetch"),
  ]);
  return { load, fetch };
}

// ─── Config ─────────────────────────────────────────────────────────────────
const BASE_URL = "https://www.war.gov/UFO/";
const REQUEST_DELAY_MS = 2000;      // wait between every HTTP request (polite)
const RETRY_ATTEMPTS   = 3;         // retries before marking a URL as error
const RETRY_BASE_MS    = 5000;      // base delay for exponential backoff
const REQUEST_TIMEOUT  = 15_000;    // abort a hung request after 15 s
const CHECKPOINT_FILE  = path.join(__dirname, ".scraper-checkpoint.json");
const DRY_RUN = process.argv.includes("--dry-run");

// ─── Supabase (service-role for write access) ────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Types ───────────────────────────────────────────────────────────────────
interface ScrapedRecord {
  title:             string;
  raw_title:         string;
  agency:            string | null;
  release_date:      string | null;   // "YYYY-MM-DD" or null
  file_type:         string | null;   // "PDF" | "Video" | "Report" | …
  file_url:          string | null;   // direct link to the document
  source_url:        string;          // canonical page URL on war.gov
  scrape_hash:       string;          // SHA-256 of source_url
  scraped_at:        string;          // ISO timestamp
  last_checked_at:   string;
  status:            "unresolved";
  classification_level: "Declassified" | "Unclassified";
  key_claims:        string[];
  evidence_tags:     string[];
  incident_country:  string;
}

interface RunStats {
  pages_fetched:    number;
  records_found:    number;
  records_new:      number;
  records_updated:  number;
  records_skipped:  number;
  errors:           number;
  error_details:    { url: string; message: string }[];
}

// ─── Utility helpers ─────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function sha256(str: string) {
  return crypto.createHash("sha256").update(str).digest("hex");
}

/** Best-effort date normaliser.  Handles "Month DD, YYYY", "YYYY-MM-DD", "MM/DD/YYYY" */
function parseDate(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // MM/DD/YYYY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;

  // Month DD, YYYY / DD Month YYYY
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  return null;
}

/** Infer file type from URL extension or link text */
function inferFileType(url: string, text: string): string {
  const u = url.toLowerCase();
  if (u.endsWith(".pdf"))        return "PDF";
  if (u.match(/\.(mp4|mov|avi|wmv|webm)$/)) return "Video";
  if (u.match(/\.(jpg|jpeg|png|gif|webp)$/)) return "Image";
  if (u.match(/\.(mp3|wav|aac)$/)) return "Audio";

  const t = text.toLowerCase();
  if (t.includes("video"))  return "Video";
  if (t.includes("pdf"))    return "PDF";
  if (t.includes("image"))  return "Image";
  if (t.includes("report")) return "Report";

  return "PDF";   // war.gov/UFO is predominantly PDFs
}

/** Guess evidence tags from a title/text string */
function inferEvidenceTags(text: string): string[] {
  const t = text.toLowerCase();
  const tags: string[] = [];
  if (t.match(/\bradar\b/))                          tags.push("radar");
  if (t.match(/\b(flir|infrared|ir\b)/))             tags.push("infrared/FLIR");
  if (t.match(/\b(video|footage|film)\b/))           tags.push("video");
  if (t.match(/\b(pilot|aircrew|crew)\b/))           tags.push("pilot testimony");
  if (t.match(/\bwitness(es)?\b/))                   tags.push("witness testimony");
  if (t.match(/\b(foia|freedom of information)\b/))  tags.push("FOIA");
  if (t.match(/\b(report|assessment|study)\b/))      tags.push("official report");
  if (t.match(/\b(congress|senate|house)\b/))        tags.push("congressional record");
  if (t.match(/\b(classified|declassif)\b/))         tags.push("government document");
  if (t.match(/\bwhistleblower\b/))                  tags.push("whistleblower");
  if (t.match(/\b(multi.sensor|multiple sensor)\b/)) tags.push("multi-sensor");
  return [...new Set(tags)];
}

/** Infer agency from page text */
function inferAgency(text: string): string | null {
  const t = text.toUpperCase();
  if (t.includes("AARO"))   return "AARO (All-domain Anomaly Resolution Office)";
  if (t.includes("ODNI"))   return "ODNI / USD(I&S)";
  if (t.includes("PENTAGON") || t.includes("DOD") || t.includes("D.O.D"))
                             return "Pentagon / AARO";
  if (t.includes("CIA"))    return "CIA";
  if (t.includes("DIA"))    return "DIA / Pentagon";
  if (t.includes("FAA"))    return "FAA / FOIA";
  if (t.includes("USAF") || t.includes("AIR FORCE")) return "USAF / FOIA";
  if (t.includes("NRO"))    return "NRO / FOIA";
  if (t.includes("NSA"))    return "NSA / FOIA";
  return null;
}

// ─── HTTP fetch with retry + exponential backoff ─────────────────────────────

async function fetchWithRetry(
  url: string,
  fetchFn: typeof import("node-fetch").default,
  attempt = 1
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const res = await fetchFn(url, {
      signal: controller.signal as Parameters<typeof fetchFn>[1] extends { signal?: infer S } ? S : never,
      headers: {
        "User-Agent":
          "UAP-Explorer-Research-Bot/1.0 (+https://github.com/your-repo; respectful-crawler)",
        "Accept": "text/html,application/xhtml+xml,*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return await res.text();
  } catch (err: unknown) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : String(err);

    if (attempt >= RETRY_ATTEMPTS) throw new Error(message);

    const backoff = RETRY_BASE_MS * Math.pow(2, attempt - 1);
    log(`  ↻ Retry ${attempt}/${RETRY_ATTEMPTS} for ${url} (${message}) — waiting ${backoff / 1000}s`);
    await sleep(backoff);
    return fetchWithRetry(url, fetchFn, attempt + 1);
  }
}

// ─── Checkpoint helpers ───────────────────────────────────────────────────────

interface Checkpoint {
  processedUrls: string[];
  lastRunAt: string;
}

function loadCheckpoint(): Checkpoint {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf8"));
    }
  } catch { /* ignore */ }
  return { processedUrls: [], lastRunAt: "" };
}

function saveCheckpoint(cp: Checkpoint) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2));
}

// ─── Logging ─────────────────────────────────────────────────────────────────

function log(msg: string) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

// ─── Core parser ─────────────────────────────────────────────────────────────
/**
 * Parse the HTML of a war.gov/UFO page into ScrapedRecord objects.
 *
 * war.gov/UFO is a government static page listing document entries.
 * This parser handles several common layouts:
 *   - <table> rows with file links
 *   - <ul>/<li> document lists
 *   - <article> or <div class="document-item"> cards
 *
 * Because the exact HTML structure may vary, the parser tries multiple
 * selectors and falls back gracefully. Run --dry-run after a real fetch
 * to inspect what was parsed before writing to the database.
 */
function parsePage(
  html: string,
  load: typeof import("cheerio").load,
  pageUrl: string
): ScrapedRecord[] {
  const $ = load(html);
  const now = new Date().toISOString();
  const records: ScrapedRecord[] = [];
  const seen = new Set<string>();

  /**
   * Build one record from a title, link URL, and optional contextual text.
   */
  function buildRecord(
    rawTitle: string,
    linkHref: string,
    contextText: string
  ): ScrapedRecord | null {
    const title = rawTitle.trim().replace(/\s+/g, " ");
    if (!title || title.length < 5) return null;

    // Resolve relative URLs
    let fileUrl: string;
    try {
      fileUrl = new URL(linkHref, BASE_URL).href;
    } catch {
      fileUrl = linkHref;
    }

    const sourceUrl = fileUrl.endsWith(".pdf") ? fileUrl : pageUrl;
    const hash = sha256(sourceUrl);
    if (seen.has(hash)) return null;
    seen.add(hash);

    const combined = `${title} ${contextText}`;
    const fileType = inferFileType(fileUrl, title);
    const agencyGuess = inferAgency(combined);
    const tags = inferEvidenceTags(combined);
    if (fileType === "PDF" || fileType === "Report") {
      if (!tags.includes("government document")) tags.push("government document");
    }

    // Try to find a date in the context text
    const dateMatch = contextText.match(
      /\b(\w+ \d{1,2},\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/
    );
    const releaseDate = dateMatch ? parseDate(dateMatch[0]) : null;

    return {
      title,
      raw_title: rawTitle.trim(),
      agency: agencyGuess,
      release_date: releaseDate,
      file_type: fileType,
      file_url: fileUrl,
      source_url: sourceUrl,
      scrape_hash: hash,
      scraped_at: now,
      last_checked_at: now,
      status: "unresolved",
      classification_level: combined.toLowerCase().includes("declassif")
        ? "Declassified"
        : "Unclassified",
      key_claims: [],
      evidence_tags: tags,
      incident_country: "USA",
    };
  }

  // ── Strategy 1: <table> rows (common for government file listings) ──
  $("table tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 2) return;

    const linkEl  = $(row).find("a[href]").first();
    const href    = linkEl.attr("href") ?? "";
    const rawTitle = linkEl.text().trim() || cells.first().text().trim();
    const context  = $(row).text();

    if (!href) return;
    const rec = buildRecord(rawTitle, href, context);
    if (rec) records.push(rec);
  });

  // ── Strategy 2: <li> items containing an <a> ──
  if (records.length < 3) {
    $("li").each((_, el) => {
      const linkEl = $(el).find("a[href]").first();
      const href   = linkEl.attr("href") ?? "";
      if (!href) return;

      const rawTitle = linkEl.text().trim() || $(el).text().trim();
      const context  = $(el).text();
      const rec = buildRecord(rawTitle, href, context);
      if (rec) records.push(rec);
    });
  }

  // ── Strategy 3: Any <a> pointing at a PDF or known file ──
  if (records.length < 3) {
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      if (!href.match(/\.(pdf|mp4|mov|avi|webm|zip)(\?.*)?$/i)) return;

      const rawTitle = $(el).text().trim() || path.basename(href).replace(/[-_]/g, " ").replace(/\.pdf$/i, "");
      // Try to grab surrounding paragraph text as context
      const context = $(el).parent().text() + " " + $(el).closest("section, article, div").text().slice(0, 500);
      const rec = buildRecord(rawTitle, href, context);
      if (rec) records.push(rec);
    });
  }

  return records;
}

// ─── Supabase upsert ──────────────────────────────────────────────────────────

async function upsertRecord(
  record: ScrapedRecord,
  stats: RunStats
): Promise<"new" | "updated" | "skipped" | "error"> {
  if (DRY_RUN) {
    log(`  [DRY] Would upsert: "${record.title}" (${record.file_type})`);
    stats.records_new++;
    return "new";
  }

  // Check if record already exists by hash
  const { data: existing } = await supabase
    .from("cases")
    .select("id, scraped_at")
    .eq("scrape_hash", record.scrape_hash)
    .maybeSingle();

  if (existing) {
    // Update last_checked_at but don't overwrite human-curated fields
    const { error } = await supabase
      .from("cases")
      .update({ last_checked_at: record.last_checked_at })
      .eq("id", existing.id);

    if (error) {
      log(`  ✗ Update failed: ${error.message}`);
      stats.errors++;
      stats.error_details.push({ url: record.source_url, message: error.message });
      return "error";
    }
    stats.records_skipped++;
    return "skipped";
  }

  // New record — insert with all scraped fields
  const { error } = await supabase.from("cases").insert({
    title:                record.title,
    raw_title:            record.raw_title,
    agency:               record.agency,
    release_date:         record.release_date,
    file_type:            record.file_type,
    file_url:             record.file_url,
    source_url:           record.source_url,
    scrape_hash:          record.scrape_hash,
    scraped_at:           record.scraped_at,
    last_checked_at:      record.last_checked_at,
    status:               record.status,
    classification_level: record.classification_level,
    key_claims:           record.key_claims,
    evidence_tags:        record.evidence_tags,
    incident_country:     record.incident_country,
    summary:              null,   // filled in manually or via AI enrichment later
    featured:             false,
  });

  if (error) {
    log(`  ✗ Insert failed: ${error.message}`);
    stats.errors++;
    stats.error_details.push({ url: record.source_url, message: error.message });
    return "error";
  }

  stats.records_new++;
  return "new";
}

// ─── Discover all pages to crawl ─────────────────────────────────────────────
/**
 * Returns the list of URLs to crawl.
 * Starts with BASE_URL and follows pagination links (?page=N, /page/N, etc.)
 * or sub-section links that appear to be document index pages.
 */
async function discoverUrls(
  html: string,
  load: typeof import("cheerio").load
): Promise<string[]> {
  const $ = load(html);
  const urls = new Set<string>([BASE_URL]);

  // Pagination links
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (!href) return;

    let resolved: string;
    try {
      resolved = new URL(href, BASE_URL).href;
    } catch {
      return;
    }

    // Only follow links that stay on war.gov/UFO or sub-paths
    if (!resolved.startsWith("https://www.war.gov")) return;

    const text = $(el).text().toLowerCase();
    const isPaginationLink =
      text.match(/\b(next|page\s*\d|more|›|»)\b/) ||
      href.match(/[?&]page=\d/) ||
      href.match(/\/page\/\d/);
    const isSubIndex =
      resolved.startsWith(BASE_URL) && !resolved.match(/\.(pdf|mp4|zip|jpg|png)$/i);

    if (isPaginationLink || isSubIndex) {
      urls.add(resolved);
    }
  });

  return [...urls];
}

// ─── Write scrape run to audit log ───────────────────────────────────────────

async function writeAuditLog(
  logId: string,
  stats: RunStats,
  startedAt: string
) {
  if (DRY_RUN) return;

  await supabase
    .from("scrape_log")
    .update({
      finished_at:      new Date().toISOString(),
      pages_fetched:    stats.pages_fetched,
      records_found:    stats.records_found,
      records_new:      stats.records_new,
      records_updated:  stats.records_updated,
      records_skipped:  stats.records_skipped,
      errors:           stats.errors,
      error_details:    stats.error_details,
    })
    .eq("id", logId);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { load, fetch } = await loadDeps();
  const startedAt = new Date().toISOString();

  log("═══════════════════════════════════════════");
  log(`UAP Explorer Scraper${DRY_RUN ? " [DRY RUN — no writes]" : ""}`);
  log(`Target: ${BASE_URL}`);
  log(`Rate limit: ${REQUEST_DELAY_MS / 1000}s between requests`);
  log("═══════════════════════════════════════════");

  const stats: RunStats = {
    pages_fetched: 0, records_found: 0, records_new: 0,
    records_updated: 0, records_skipped: 0, errors: 0, error_details: [],
  };

  // Create audit log row
  let logId = "";
  if (!DRY_RUN) {
    const { data } = await supabase
      .from("scrape_log")
      .insert({ started_at: startedAt, dry_run: false })
      .select("id")
      .single();
    logId = data?.id ?? "";
  }

  // Load checkpoint to skip already-processed URLs
  const checkpoint = loadCheckpoint();
  const processedSet = new Set(checkpoint.processedUrls);

  // ── Phase 1: Fetch index page and discover all sub-pages ──
  log(`\nPhase 1 — Discovering pages…`);
  let indexHtml: string;
  try {
    indexHtml = await fetchWithRetry(BASE_URL, fetch);
    stats.pages_fetched++;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`✗ Could not fetch index page: ${msg}`);
    stats.errors++;
    stats.error_details.push({ url: BASE_URL, message: msg });
    await writeAuditLog(logId, stats, startedAt);
    process.exit(1);
  }

  const pagesToCrawl = await discoverUrls(indexHtml, load);
  log(`Found ${pagesToCrawl.length} page(s) to crawl.`);

  // Register pages in scrape_queue
  if (!DRY_RUN) {
    await supabase.from("scrape_queue").upsert(
      pagesToCrawl.map((url) => ({ url, status: "pending" })),
      { onConflict: "url", ignoreDuplicates: true }
    );
  }

  // ── Phase 2: Crawl each page ──
  log(`\nPhase 2 — Crawling pages…`);

  for (const pageUrl of pagesToCrawl) {
    if (processedSet.has(pageUrl)) {
      log(`  ⏭  Skipping (checkpoint): ${pageUrl}`);
      continue;
    }

    log(`\n  → Fetching: ${pageUrl}`);
    await sleep(REQUEST_DELAY_MS);

    let html: string;
    try {
      html = pageUrl === BASE_URL ? indexHtml : await fetchWithRetry(pageUrl, fetch);
      stats.pages_fetched++;

      if (!DRY_RUN) {
        await supabase.from("scrape_queue")
          .update({ status: "processing", attempt: 1, processed_at: new Date().toISOString() })
          .eq("url", pageUrl);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`  ✗ Failed: ${msg}`);
      stats.errors++;
      stats.error_details.push({ url: pageUrl, message: msg });

      if (!DRY_RUN) {
        await supabase.from("scrape_queue")
          .update({ status: "error", last_error: msg })
          .eq("url", pageUrl);
      }
      continue;
    }

    // Parse records from the page
    const records = parsePage(html, load, pageUrl);
    log(`  Found ${records.length} record(s) on this page.`);
    stats.records_found += records.length;

    // Upsert each record
    for (const record of records) {
      await sleep(50); // tiny pause between DB writes
      const result = await upsertRecord(record, stats);
      const icon = { new: "✓", updated: "↺", skipped: "–", error: "✗" }[result];
      if (result !== "skipped") {
        log(`    ${icon} ${result.padEnd(7)} "${record.title.slice(0, 70)}"`);
      }
    }

    // Mark done in queue + checkpoint
    if (!DRY_RUN) {
      await supabase.from("scrape_queue")
        .update({ status: "done", processed_at: new Date().toISOString() })
        .eq("url", pageUrl);
    }
    checkpoint.processedUrls.push(pageUrl);
    saveCheckpoint(checkpoint);
  }

  // ── Summary ──
  log("\n═══════════════════════════════════════════");
  log("Scrape complete.");
  log(`  Pages fetched : ${stats.pages_fetched}`);
  log(`  Records found : ${stats.records_found}`);
  log(`  New inserted  : ${stats.records_new}`);
  log(`  Updated       : ${stats.records_updated}`);
  log(`  Skipped       : ${stats.records_skipped}`);
  log(`  Errors        : ${stats.errors}`);
  if (stats.error_details.length > 0) {
    log("\n  Errors:");
    for (const e of stats.error_details) {
      log(`    • ${e.url}: ${e.message}`);
    }
  }
  log("═══════════════════════════════════════════\n");

  await writeAuditLog(logId, stats, startedAt);

  // Clear checkpoint on clean run so next run starts fresh
  if (stats.errors === 0 && !DRY_RUN) {
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ processedUrls: [], lastRunAt: new Date().toISOString() }, null, 2));
    log("Checkpoint cleared for next run.");
  } else if (stats.errors > 0) {
    log("Checkpoint kept — re-run to retry failed pages.");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
