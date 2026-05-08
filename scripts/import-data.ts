/**
 * UAP Explorer — Manual Import Script
 *
 * Usage:
 *   npm run import
 *
 * Before running:
 *   1. Copy .env.local.example → .env.local and fill in your Supabase keys.
 *   2. Make sure you have run the schema.sql in Supabase SQL Editor.
 *   3. Add records to the RECORDS array below, then run npm run import.
 *
 * The script uses the service-role key to bypass Row Level Security for writes.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // write access
);

// ──────────────────────────────────────────────────────────────
// ADD NEW RECORDS HERE
// Copy a block, fill in the fields, save, then run: npm run import
// ──────────────────────────────────────────────────────────────
const RECORDS: Record<string, unknown>[] = [
  {
    title: "Example Record — Replace With Real Data",
    agency: "AARO (All-domain Anomaly Resolution Office)",
    release_date: "2024-01-01",
    incident_date: "2023-06-15",
    incident_location: "Example Location, USA",
    incident_country: "USA",
    file_type: "PDF",
    source_url: "https://www.war.gov/UFO/",
    summary:
      "Replace this with a plain-English summary of what the document says. Keep it 2-4 sentences. Focus on the most important facts.",
    key_claims: [
      "First key claim from the document",
      "Second key claim from the document",
    ],
    evidence_tags: ["radar", "pilot testimony"],
    status: "unresolved",
    classification_level: "Declassified",
    featured: false,
  },
];

async function importRecords() {
  console.log(`\nImporting ${RECORDS.length} record(s) into Supabase...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const record of RECORDS) {
    const { data, error } = await supabase
      .from("cases")
      .insert(record)
      .select("id, title")
      .single();

    if (error) {
      console.error(`✗ Failed: "${record.title}"`);
      console.error(`  ${error.message}\n`);
      errorCount++;
    } else {
      console.log(`✓ Inserted: "${data.title}" (id: ${data.id})`);
      successCount++;
    }
  }

  console.log(`\nDone. ${successCount} inserted, ${errorCount} failed.\n`);
}

importRecords().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
