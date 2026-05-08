import { createClient } from "@supabase/supabase-js";
import type { Case, SearchFilters } from "./types";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getCases(
  filters: Partial<SearchFilters> = {},
  page = 1,
  pageSize = 12
): Promise<{ data: Case[]; count: number }> {
  let query = supabase
    .from("cases")
    .select("*", { count: "exact" })
    .order("release_date", { ascending: false, nullsFirst: false });

  if (filters.query?.trim()) {
    query = query.textSearch("fts", filters.query.trim(), {
      type: "websearch",
      config: "english",
    });
  }

  if (filters.agency) {
    query = query.eq("agency", filters.agency);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.fileType) {
    query = query.eq("file_type", filters.fileType);
  }

  if (filters.evidenceTag) {
    query = query.contains("evidence_tags", [filters.evidenceTag]);
  }

  if (filters.country) {
    query = query.eq("incident_country", filters.country);
  }

  if (filters.yearFrom) {
    query = query.gte("release_date", `${filters.yearFrom}-01-01`);
  }

  if (filters.yearTo) {
    query = query.lte("release_date", `${filters.yearTo}-12-31`);
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return { data: (data as Case[]) ?? [], count: count ?? 0 };
}

export async function getCaseById(id: string): Promise<Case | null> {
  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as Case;
}

export async function getFeaturedCases(): Promise<Case[]> {
  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("featured", true)
    .order("release_date", { ascending: false })
    .limit(6);

  if (error) throw error;
  return (data as Case[]) ?? [];
}

export async function getStats(): Promise<{
  total: number;
  unresolved: number;
  agencies: number;
}> {
  const [totalRes, unresolvedRes, agencyRes] = await Promise.all([
    supabase.from("cases").select("id", { count: "exact", head: true }),
    supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("status", "unresolved"),
    supabase.from("cases").select("agency"),
  ]);

  const uniqueAgencies = new Set(
    (agencyRes.data ?? []).map((r: { agency: string }) => r.agency).filter(Boolean)
  );

  return {
    total: totalRes.count ?? 0,
    unresolved: unresolvedRes.count ?? 0,
    agencies: uniqueAgencies.size,
  };
}
