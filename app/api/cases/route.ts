import { NextRequest, NextResponse } from "next/server";
import { getCases } from "@/lib/supabase";
import type { SearchFilters } from "@/lib/types";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const filters: Partial<SearchFilters> = {
    query: sp.get("query") ?? "",
    agency: sp.get("agency") ?? "",
    status: sp.get("status") ?? "",
    fileType: sp.get("fileType") ?? "",
    evidenceTag: sp.get("evidenceTag") ?? "",
    yearFrom: sp.get("yearFrom") ?? "",
    yearTo: sp.get("yearTo") ?? "",
    country: sp.get("country") ?? "",
  };

  const page = Number(sp.get("page") ?? 1);
  const pageSize = Number(sp.get("pageSize") ?? 12);

  try {
    const result = await getCases(filters, page, pageSize);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch cases" }, { status: 500 });
  }
}
