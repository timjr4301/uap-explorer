-- ============================================================
-- UAP Explorer — Supabase Schema
-- Run this in the Supabase SQL Editor (supabase.com → your project → SQL Editor)
-- ============================================================

-- Enable full-text search extension
create extension if not exists pg_trgm;

-- ============================================================
-- CASES table — one row per declassified document / incident
-- ============================================================
create table if not exists cases (
  id            uuid primary key default gen_random_uuid(),

  -- Identification
  title         text not null,
  slug          text unique,               -- URL-friendly identifier

  -- Who released it
  agency        text,                      -- e.g. "Pentagon", "CIA", "AARO", "FOIA"

  -- Dates
  release_date  date,                      -- when the document was publicly released
  incident_date date,                      -- when the UAP event occurred (NULL = unknown)

  -- Where
  incident_location text,                  -- free-text: "Nimitz, Pacific Ocean"
  incident_country  text default 'USA',

  -- File
  file_type     text,                      -- "PDF", "Video", "Image", "Audio", "Report"
  source_url    text,                      -- original government URL (war.gov/UFO/...)
  page_count    integer,

  -- AI-generated summaries
  summary       text,                      -- 2-4 sentence plain-English summary
  key_claims    text[] default '{}',       -- array of short bullet strings

  -- Classification / Evidence
  evidence_tags text[] default '{}',       -- e.g. "radar", "visual", "infrared", "pilot testimony"
  status        text default 'unresolved'
                check (status in ('resolved','unresolved','ongoing','unknown')),
  classification_level text default 'Unclassified',  -- "Unclassified", "Declassified", "Redacted"

  -- Admin
  featured      boolean default false,     -- show on homepage
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- Full-text search column (auto-populated trigger)
-- ============================================================
alter table cases add column if not exists
  fts tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(incident_location, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(agency, '')), 'C')
  ) stored;

create index if not exists cases_fts_idx on cases using gin(fts);

-- ============================================================
-- Indexes for filter columns
-- ============================================================
create index if not exists cases_agency_idx        on cases (agency);
create index if not exists cases_status_idx        on cases (status);
create index if not exists cases_file_type_idx     on cases (file_type);
create index if not exists cases_release_date_idx  on cases (release_date desc nulls last);
create index if not exists cases_incident_date_idx on cases (incident_date desc nulls last);
create index if not exists cases_featured_idx      on cases (featured) where featured = true;
create index if not exists cases_country_idx       on cases (incident_country);

-- GIN index on array columns for containment queries (@>)
create index if not exists cases_evidence_tags_idx on cases using gin(evidence_tags);
create index if not exists cases_key_claims_idx    on cases using gin(key_claims);

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cases_updated_at on cases;
create trigger cases_updated_at
  before update on cases
  for each row execute function set_updated_at();

-- ============================================================
-- Row Level Security — public read, no public write
-- ============================================================
alter table cases enable row level security;

create policy "Public read access"
  on cases for select
  using (true);

-- ============================================================
-- SEED DATA — 12 real/representative declassified records
-- Swap source_url for the actual war.gov URLs once you verify them.
-- ============================================================
insert into cases (title, agency, release_date, incident_date, incident_location, incident_country, file_type, source_url, summary, key_claims, evidence_tags, status, classification_level, featured)
values

(
  'USS Nimitz Tic-Tac Encounter — FLIR Video',
  'Pentagon / AARO',
  '2020-04-27',
  '2004-11-14',
  'Pacific Ocean, off San Diego, CA',
  'USA',
  'Video',
  'https://www.war.gov/UFO/',
  'Navy F/A-18 pilots from the USS Nimitz carrier strike group tracked an unidentified aerial vehicle later nicknamed "Tic Tac" using radar and FLIR. The object exhibited no visible propulsion, no control surfaces, and accelerated from hover to supersonic speed. The DoD officially declassified this footage in April 2020.',
  ARRAY['Object hovered at 80,000 ft then dropped to sea level in seconds','No heat signature consistent with known propulsion','ATFLIR targeting pod locked on briefly before object accelerated away','Multiple F/A-18 crews reported the same object over several days'],
  ARRAY['radar','infrared/FLIR','pilot testimony','video','multi-sensor'],
  'unresolved',
  'Declassified',
  true
),

(
  'USS Theodore Roosevelt — GIMBAL Video',
  'Pentagon / AARO',
  '2020-04-27',
  '2015-01-01',
  'US East Coast, Atlantic Ocean',
  'USA',
  'Video',
  'https://www.war.gov/UFO/',
  'FLIR footage captured from an F/A-18F shows an object rotating against the wind while maintaining steady flight, inconsistent with known aircraft behavior. Leaked in 2017 and officially released by the DoD in 2020. Pilots are heard expressing surprise at the object''s apparent rotation.',
  ARRAY['Object appears to rotate while in stable flight','No visible wings or control surfaces','Observed by multiple aircrew on multiple sorties','Infrared signature inconsistent with conventional propulsion'],
  ARRAY['infrared/FLIR','pilot testimony','video','radar'],
  'unresolved',
  'Declassified',
  true
),

(
  'USS Roosevelt — GoFast Video',
  'Pentagon / AARO',
  '2020-04-27',
  '2015-01-01',
  'US East Coast, Atlantic Ocean',
  'USA',
  'Video',
  'https://www.war.gov/UFO/',
  'Third officially released DoD video shows an object moving at high speed just above the ocean surface. Analysts noted the object''s ground speed relative to ocean chop suggests speeds difficult to reconcile with known aircraft at that altitude.',
  ARRAY['Object travelling at apparent high velocity near sea surface','ATFLIR tracking shows rapid lateral movement','No sonic boom observed by aircrew','No corresponding ATC transponder signal'],
  ARRAY['infrared/FLIR','video','pilot testimony'],
  'unresolved',
  'Declassified',
  true
),

(
  'AARO Historical Record Report — Volume I',
  'AARO (All-domain Anomaly Resolution Office)',
  '2024-03-08',
  NULL,
  'United States (Multiple Locations)',
  'USA',
  'Report',
  'https://www.war.gov/UFO/',
  'The All-domain Anomaly Resolution Office released its first congressionally mandated historical record report examining U.S. government investigations of UAP dating back to the 1940s. The report found no verifiable evidence that the U.S. government has recovered non-human craft or biological material.',
  ARRAY['No credible evidence of recovered non-human craft found in historical records','UAP programs since 1940s reviewed; SIGN, GRUDGE, BLUEBOOK examined','Many historical sightings remain unexplained but attributed to sensor artifacts or foreign tech','Witness accounts of reverse-engineering programs could not be verified'],
  ARRAY['official report','historical analysis','government testimony'],
  'ongoing',
  'Unclassified',
  true
),

(
  'UAP Task Force — Preliminary Assessment Report',
  'ODNI / USD(I&S)',
  '2021-06-25',
  NULL,
  'United States (Multiple Locations)',
  'USA',
  'Report',
  'https://www.war.gov/UFO/',
  'The first modern official UAP report mandated by Congress. The ODNI and Defense Department reviewed 144 UAP incidents between 2004–2021, 143 of which could not be explained. The report established five explanatory categories and called for improved data collection.',
  ARRAY['143 of 144 cases remain unexplained','18 incidents showed unusual movement patterns including instantaneous acceleration','UAP pose a flight safety and national security risk','Possible categories: airborne clutter, natural phenomena, USG/industry programs, foreign adversary, other'],
  ARRAY['radar','pilot testimony','official report','multi-sensor'],
  'ongoing',
  'Unclassified',
  true
),

(
  'CIA Robertson Panel Files — Project SIGN Reanalysis',
  'CIA',
  '1997-01-01',
  '1953-01-14',
  'Washington D.C.',
  'USA',
  'PDF',
  'https://www.war.gov/UFO/',
  'Declassified CIA files from the 1953 Robertson Panel, a scientific advisory committee that recommended debunking public UAP reports to reduce strain on military reporting channels. The panel reviewed over 75 cases in two days and concluded most were misidentifications.',
  ARRAY['Panel recommended a public education campaign to reduce UAP reports','Citizen UAP groups flagged as potential intelligence risk','Panel was not given full access to Blue Book files','Several cases reviewed remain unexplained in panel notes'],
  ARRAY['official report','historical analysis','government document'],
  'resolved',
  'Declassified',
  false
),

(
  'Malmstrom AFB Nuclear ICBM Shutdown Incident',
  'USAF / FOIA',
  '2010-09-27',
  '1967-03-16',
  'Malmstrom Air Force Base, Montana',
  'USA',
  'PDF',
  'https://www.war.gov/UFO/',
  'Declassified Air Force documents and FOIA-released testimony describe how ten Minuteman I ICBMs at Oscar Flight went offline simultaneously as a glowing red disc-shaped object was observed hovering outside the front gate. Launch control officer Robert Salas has testified under oath about this event.',
  ARRAY['All 10 ICBMs at Oscar Flight went to "no-go" status simultaneously','Guards reported a glowing red object outside the gate','Similar shutdowns reported at Echo Flight the same month','Air Force initially denied then partially confirmed the incidents'],
  ARRAY['witness testimony','government document','FOIA','military incident'],
  'unresolved',
  'Declassified',
  true
),

(
  'AATIP Program — Congressional Briefing Materials',
  'DIA / Pentagon',
  '2017-12-16',
  NULL,
  'Washington D.C.',
  'USA',
  'PDF',
  'https://www.war.gov/UFO/',
  'Documents and briefing materials related to the Advanced Aerospace Threat Identification Program (AATIP), a covert Pentagon program that ran from 2007–2012 with $22 million in funding. Existence confirmed by the New York Times and subsequently by the DoD.',
  ARRAY['$22 million in black-budget funding from 2007–2012','Program run by Bigelow Aerospace under DIA contract','Produced reports on advanced aerospace propulsion concepts','Luis Elizondo claims program continued informally after 2012'],
  ARRAY['official report','government document','classified program'],
  'ongoing',
  'Declassified',
  false
),

(
  'FAA Radar Data — Japan Airlines Flight 1628',
  'FAA / FOIA',
  '1988-03-05',
  '1986-11-17',
  'Alaska, Near Anchorage',
  'USA',
  'PDF',
  'https://www.war.gov/UFO/',
  'FAA radar tapes and pilot reports document Japan Airlines cargo captain Kenju Terauchi tracking a massive unidentified craft for over 30 minutes. The object was confirmed on both aircraft radar and FAA ground radar, and military radar. The FAA investigation concluded the radar returns were real.',
  ARRAY['Object tracked for over 50 minutes by aircraft and FAA radar','Estimated size larger than two aircraft carriers per crew description','FAA Division Chief John Callahan later testified the CIA told his team to keep quiet','Crew reassigned after speaking publicly'],
  ARRAY['radar','pilot testimony','FAA document','multi-sensor'],
  'unresolved',
  'Declassified',
  false
),

(
  'Chilean Navy CEFAA Infrared Video',
  'Chilean Navy / CEFAA',
  '2017-01-05',
  '2014-11-11',
  'Coastal Chile, Pacific Coast',
  'Chile',
  'Video',
  'https://www.war.gov/UFO/',
  'Chilean Navy helicopter crew captured a 9-minute infrared video of an unidentified object that expelled two plumes of hot gas before disappearing. The Chilean government''s official UAP investigation agency (CEFAA) analyzed the footage for two years and concluded it was genuine and unexplained.',
  ARRAY['9-minute FLIR video taken by Navy helicopter crew','Object emitted two separate hot gas plumes','Tracked on radar but did not appear on ATC systems','Official Chilean military investigation found no explanation'],
  ARRAY['infrared/FLIR','radar','pilot testimony','video','foreign government'],
  'unresolved',
  'Declassified',
  false
),

(
  'AARO UAP Incident Report Database — FY2023 Cases',
  'AARO (All-domain Anomaly Resolution Office)',
  '2024-02-15',
  NULL,
  'United States (Multiple Locations)',
  'USA',
  'Report',
  'https://www.war.gov/UFO/',
  'AARO''s first annual release of aggregated UAP case data covering fiscal year 2023. Includes 291 new reports, bringing the total to over 800 since 2021. Majority still under review; a portion attributed to unmanned aerial systems, balloons, or sensor artifacts.',
  ARRAY['291 new UAP reports in FY2023 alone','Total case count exceeds 800 since 2021','Roughly half of cases remain uncharacterized','Some cases involve multiple sensor types including radar, optical, and RF'],
  ARRAY['official report','radar','multi-sensor','government database'],
  'ongoing',
  'Unclassified',
  true
),

(
  'Pentagon UFO Briefing — Congressional Classified Session',
  'DoD / AARO',
  '2023-07-26',
  NULL,
  'Washington D.C.',
  'USA',
  'Report',
  'https://www.war.gov/UFO/',
  'Following a closed congressional hearing, multiple members of the House Oversight Committee publicly stated they saw compelling UAP footage and data. Whistleblower David Grusch testified under oath that the U.S. has retrieved non-human craft and biologics, claims the DoD denies.',
  ARRAY['David Grusch testified under oath about recovered non-human craft','Grusch says he was denied access to programs he was directed to investigate','Multiple congressmembers described footage as compelling','DoD Inspector General opened investigation into whistleblower retaliation claims'],
  ARRAY['government testimony','whistleblower','classified briefing','congressional record'],
  'unresolved',
  'Unclassified',
  true
);

-- Verify
select count(*) as total_cases from cases;
