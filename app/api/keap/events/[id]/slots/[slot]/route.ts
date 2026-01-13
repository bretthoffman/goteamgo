import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type Ctx = { params: Promise<{ id: string; slot: string }> };

export async function PATCH(req: Request, context: Ctx) {
  const sb = supabaseServer();
  const { id: eventId, slot } = await context.params;
  const slotIndex = Number(slot);

  const body = await req.json();
  const { enabled, offset_minutes, subject, html, text_fallback } = body;

  const { data, error } = await sb
    .from("keap_call_event_slots")
    .update({
      enabled,
      offset_minutes,
      subject,
      html,
      text_fallback,
    })
    .eq("event_id", eventId)
    .eq("slot_index", slotIndex)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ slot: data });
}