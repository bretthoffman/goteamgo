import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    const sb = supabaseServer();

    const query = sb
      .from("keap_call_events")
      .select("*")
      .order("start_at", { ascending: true });

    const ranged = start && end ? query.gte("start_at", start).lte("start_at", end) : query;

    const { data: rows, error } = await ranged;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const all = (rows ?? []) as Array<{
      id: string;
      start_at: string;
      event_kind?: string | null;
      parent_event_id?: string | null;
      post_event_enabled?: boolean | null;
      [k: string]: unknown;
    }>;

    // Include description_copy events only when their parent has post_event_enabled = true
    const descriptionCopy = all.filter((e) => (e.event_kind ?? "call") === "description_copy");
    let allowedPostEventIds = new Set<string>();
    if (descriptionCopy.length > 0) {
      const parentIds = [...new Set(descriptionCopy.map((e) => e.parent_event_id).filter(Boolean))] as string[];
      const { data: parents } = await sb
        .from("keap_call_events")
        .select("id")
        .in("id", parentIds)
        .eq("post_event_enabled", true);
      allowedPostEventIds = new Set((parents ?? []).map((p: { id: string }) => p.id));
    }

    const events = all.filter(
      (e) =>
        (e.event_kind ?? "call") === "call" ||
        ((e.event_kind ?? "call") === "description_copy" && e.parent_event_id && allowedPostEventIds.has(e.parent_event_id))
    );

    return NextResponse.json({ events });
  } catch (e: any) {
    console.error("GET /api/keap/events failed:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, call_type, start_at, end_at } = body;

    const sb = supabaseServer();

    const { data: event, error: e1 } = await sb
      .from("keap_call_events")
      .insert([{ title, call_type, start_at, end_at }])
      .select("*")
      .single();

    if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });

    const slots = [1, 2, 3].map((i) => ({
      event_id: event.id,
      slot_index: i,
      enabled: false,
      offset_minutes: i === 1 ? -1440 : i === 2 ? -360 : -15,
      subject: "",
      html: "",
      text_fallback: "",
    }));

    const { error: e2 } = await sb.from("keap_call_event_slots").insert(slots);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });

    return NextResponse.json({ event });
  } catch (e: any) {
    console.error("POST /api/keap/events failed:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}