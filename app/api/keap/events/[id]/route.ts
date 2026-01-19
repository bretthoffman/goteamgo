import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: Ctx) {
  const sb = supabaseServer();
  const { id: eventId } = await context.params;

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

export async function PATCH(req: Request, context: Ctx) {
  const sb = supabaseServer();
  const { id: eventId } = await context.params;

  const body = await req.json();
  const { title, call_type, start_at, end_at, notes, confirmed } = body;

  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (call_type !== undefined) updateData.call_type = call_type;
  if (start_at !== undefined) updateData.start_at = start_at;
  if (end_at !== undefined) updateData.end_at = end_at;
  if (notes !== undefined) updateData.notes = notes;
  if (confirmed !== undefined) updateData.confirmed = confirmed;

  const { data, error } = await sb
    .from("keap_call_events")
    .update(updateData)
    .eq("id", eventId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ event: data });
}

export async function DELETE(_req: Request, context: Ctx) {
  const sb = supabaseServer();
  const { id: eventId } = await context.params;

  const { error } = await sb.from("keap_call_events").delete().eq("id", eventId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}