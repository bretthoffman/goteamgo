import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(_: Request, ctx: { params: { id: string } }) {
  const sb = supabaseServer();
  const eventId = ctx.params.id;

  const { data: event, error: e1 } = await sb
    .from("keap_call_events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });

  const { data: slots, error: e2 } = await sb
    .from("keap_call_event_slots")
    .select("*")
    .eq("event_id", eventId)
    .order("slot_index", { ascending: true });

  if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });

  return NextResponse.json({ event, slots: slots ?? [] });
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const sb = supabaseServer();
  const eventId = ctx.params.id;
  const body = await req.json();

  const { title, call_type, start_at, end_at, notes } = body;

  const { data, error } = await sb
    .from("keap_call_events")
    .update({ title, call_type, start_at, end_at, notes })
    .eq("id", eventId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ event: data });
}

export async function DELETE(_: Request, ctx: { params: { id: string } }) {
  const sb = supabaseServer();
  const eventId = ctx.params.id;

  const { error } = await sb.from("keap_call_events").delete().eq("id", eventId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}