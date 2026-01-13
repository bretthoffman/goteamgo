import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start"); // ISO
  const end = searchParams.get("end");     // ISO

  const sb = supabaseServer();

  // If no range provided, just return recent-ish
  const query = sb
    .from("keap_call_events")
    .select("*")
    .order("start_at", { ascending: true });

  const ranged = start && end
    ? query.gte("start_at", start).lte("start_at", end)
    : query;

  const { data, error } = await ranged;

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ events: data ?? [] });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { title, call_type, start_at, end_at } = body;

  const sb = supabaseServer();

  // create event
  const { data: event, error: e1 } = await sb
    .from("keap_call_events")
    .insert([{ title, call_type, start_at, end_at }])
    .select("*")
    .single();

  if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });

  // create default 3 slots (enabled true, offsets default -15)
  const slots = [1, 2, 3].map((i) => ({
    event_id: event.id,
    slot_index: i,
    enabled: true,
    offset_minutes: i === 1 ? -1440 : i === 2 ? -360 : -15, // default suggestion: 24h, 6h, 15m
    subject: "",
    html: "",
    text_fallback: "",
  }));

  const { error: e2 } = await sb.from("keap_call_event_slots").insert(slots);
  if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });

  return NextResponse.json({ event });
}