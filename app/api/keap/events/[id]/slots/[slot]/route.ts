import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function PATCH(
  req: Request,
  ctx: { params: { id: string; slot: string } }
) {
  const sb = supabaseServer();
  const eventId = ctx.params.id;
  const slotIndex = Number(ctx.params.slot);

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