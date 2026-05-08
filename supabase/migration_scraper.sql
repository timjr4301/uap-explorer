-- ============================================================
-- UAP Explorer — Scraper migration
-- Run this AFTER schema.sql if you have an existing database,
-- or schema.sql already includes these if starting fresh.
-- ============================================================

-- Add scraper-tracking columns to cases
alter table cases
  add column if not exists raw_title       text,          -- original title text scraped verbatim
  add column if not exists file_url        text,          -- direct URL to the file (PDF/video)
  add column if not exists file_size_bytes bigint,        -- file size if detectable
  add column if not exists scrape_hash     text unique,   -- SHA-256 of source_url to detect duplicates fast
  add column if not exists scraped_at      timestamptz,   -- when this record was first scraped
  add column if not exists last_checked_at timestamptz;   -- when scraper last verified this record

create index if not exists cases_scrape_hash_idx    on cases (scrape_hash);
create index if not exists cases_scraped_at_idx     on cases (scraped_at);
create index if not exists cases_last_checked_at_idx on cases (last_checked_at);

-- ============================================================
-- SCRAPE_LOG table — one row per scrape run for auditing
-- ============================================================
create table if not exists scrape_log (
  id            uuid primary key default gen_random_uuid(),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  pages_fetched integer default 0,
  records_found integer default 0,
  records_new   integer default 0,
  records_updated integer default 0,
  records_skipped integer default 0,
  errors        integer default 0,
  error_details jsonb default '[]',   -- array of {url, message} objects
  dry_run       boolean default false,
  notes         text
);

-- ============================================================
-- SCRAPE_QUEUE table — tracks URLs waiting to be processed
-- ============================================================
create table if not exists scrape_queue (
  id          uuid primary key default gen_random_uuid(),
  url         text unique not null,
  status      text default 'pending'
              check (status in ('pending','processing','done','error','skipped')),
  attempt     integer default 0,
  last_error  text,
  queued_at   timestamptz default now(),
  processed_at timestamptz
);

create index if not exists scrape_queue_status_idx on scrape_queue (status);
create index if not exists scrape_queue_url_idx    on scrape_queue (url);
