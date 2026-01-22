import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  try {
    const sb = supabaseServer();

    // First, get the total count
    const { count, error: countError } = await sb
      .from("keap_contacts")
      .select("*", { count: "exact", head: true });

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 400 });
    }

    const totalCount = count ?? 0;
    const batchSize = 1000; // Supabase default limit
    const allContacts: any[] = [];
    let offset = 0;

    // Fetch all contacts in batches
    while (offset < totalCount) {
      const { data, error } = await sb
        .from("keap_contacts")
        .select("*")
        .range(offset, offset + batchSize - 1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (data && data.length > 0) {
        allContacts.push(...data);
        offset += batchSize;
      } else {
        // No more data
        break;
      }
    }

    console.log(`Fetched ${allContacts.length} contacts out of ${totalCount} total`);

    return NextResponse.json({ 
      contacts: allContacts, 
      totalCount: totalCount 
    });
  } catch (e: any) {
    console.error("GET /api/keap/contacts failed:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}
