# UAP Explorer — Step-by-Step Setup Guide
### For non-coders. Takes about 30–45 minutes.

---

## What you'll need (all free)

| Tool | What it does | Link |
|------|-------------|------|
| Node.js | Runs the code on your computer | nodejs.org |
| Supabase | Free cloud database | supabase.com |
| Vercel | Free hosting for the website | vercel.com |
| GitHub | Stores your code (Vercel needs it) | github.com |

---

## Step 1 — Install Node.js

1. Go to **nodejs.org** and download the "LTS" version.
2. Run the installer. Accept all defaults.
3. Open a terminal (search "PowerShell" on Windows) and type:
   ```
   node -v
   ```
   You should see something like `v20.x.x`. If so, Node.js is working.

---

## Step 2 — Set up your Supabase database

1. Go to **supabase.com** → Sign up (free).
2. Click **New project**. Name it `uap-explorer`. Choose a region close to you.
3. Wait for the project to finish creating (~1 minute).
4. In the left sidebar click **SQL Editor**.
5. Click **New query**.
6. Open the file `supabase/schema.sql` from this project folder.
7. Copy **all** of its contents and paste into the SQL Editor.
8. Click **Run** (or press Ctrl+Enter).
9. You should see `total_cases = 12` at the bottom. Your database is ready.

---

## Step 3 — Get your Supabase keys

1. In Supabase, click **Project Settings** (gear icon, bottom-left).
2. Click **API**.
3. Copy these two values — you'll need them next:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon / public key** (long string of letters)
   - **service_role key** (only needed for the import script — keep secret!)

---

## Step 4 — Configure the project

1. In the `uap-explorer` folder, find the file `.env.local.example`.
2. Make a copy of it and name the copy `.env.local` (no "example").
3. Open `.env.local` in Notepad and fill in your values:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-ID.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. Save the file.

---

## Step 5 — Install dependencies and run locally

Open PowerShell, navigate to the project folder:

```powershell
cd C:\Users\timjr.BJT\uap-explorer
npm install
npm run dev
```

Open your browser to **http://localhost:3000** — you should see the UAP Explorer homepage!

---

## Step 6 — Deploy to Vercel (put it on the internet)

1. Push this folder to a **GitHub repository**:
   - Go to github.com → New repository → name it `uap-explorer`
   - Follow GitHub's instructions to push an existing project.

2. Go to **vercel.com** → Sign up with your GitHub account.
3. Click **Add New Project** → select your `uap-explorer` repo.
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
5. Click **Deploy**. Vercel builds and publishes your site in ~2 minutes.
6. You'll get a free URL like `uap-explorer.vercel.app`.

---

## Step 7 — Run the scraper (pulls live data from war.gov/UFO)

The scraper automatically fetches document listings from the official government site and saves them to your database.

**Before first run** — apply the scraper migration to your database:
1. In Supabase → **SQL Editor** → New query
2. Copy the contents of `supabase/migration_scraper.sql` → **Run**

**Dry run first** (shows what it would do, writes nothing):
```powershell
npm run scrape:dry
```

**Live run** (writes to database):
```powershell
npm run scrape
```

**What it does:**
- Fetches war.gov/UFO index and any sub-pages it finds
- Waits 2 seconds between every request (polite — won't overload their server)
- Retries failed requests up to 3 times with automatic backoff
- Skips records already in your database (deduplication)
- Saves a checkpoint file — if it crashes, re-run and it picks up where it stopped
- Writes a full audit log to Supabase (`scrape_log` table)

**Rate limiting:** The scraper waits 2 seconds between HTTP requests by default. This is intentionally conservative. The government server will not notice it.

---

## Step 8 — Adding records manually

To add a record by hand:

1. Open `scripts/import-data.ts` in a text editor.
2. Find the `RECORDS` array near the top.
3. Copy the example block and fill in your data.
4. Save the file, then run:
   ```
   npm run import
   ```

Or add records directly in Supabase:
- Go to **Table Editor** → `cases` table → **Insert row**.

---

## File overview

```
uap-explorer/
├── app/
│   ├── page.tsx          ← Homepage
│   ├── search/page.tsx   ← Search & filter page
│   ├── cases/[id]/page.tsx ← Individual case page
│   └── api/cases/route.ts  ← API endpoint (handles filters)
├── components/
│   ├── CaseCard.tsx      ← The card shown in search results
│   ├── SearchFilters.tsx ← All the filter dropdowns
│   ├── Header.tsx        ← Top navigation bar
│   ├── Footer.tsx        ← Site footer with disclaimer
│   └── Disclaimer.tsx    ← "Not affiliated with government" notice
├── lib/
│   ├── supabase.ts       ← Database query functions
│   └── types.ts          ← TypeScript type definitions
├── scripts/
│   └── import-data.ts    ← Script to add new records
├── supabase/
│   └── schema.sql        ← Run this in Supabase SQL Editor
└── .env.local            ← Your private keys (never share this!)
```

---

## Troubleshooting

**"Cannot find module" errors** → Run `npm install` again.

**Blank page or database errors** → Double-check your `.env.local` keys have no typos.

**SQL errors in Supabase** → Make sure you ran the full `schema.sql` file, not just part of it.

**Vercel deploy fails** → Make sure all three environment variables are set in the Vercel dashboard.
