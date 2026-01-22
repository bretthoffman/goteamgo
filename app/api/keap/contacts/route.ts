import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  try {
    const sb = supabaseServer();

    const { data, error, count } = await sb
      .from("keap_contacts")
      .select("*", { count: "exact" })
      .limit(100000); // Get all contacts (51k rows)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      contacts: data ?? [], 
      totalCount: count ?? 0 
    });
  } catch (e: any) {
    console.error("GET /api/keap/contacts failed:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}
