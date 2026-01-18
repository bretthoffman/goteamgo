import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type Ctx = { params: Promise<{ id: string; slot: string }> };

export async function PATCH(req: Request, context: Ctx) {
  const sb = supabaseServer();
  const { id: eventId, slot } = await context.params;
  const slotIndex = Number(slot);

  const body = await req.json().catch(() => ({}));
  const { enabled, offset_minutes, subject, html, text_fallback, reminder_key } = body as {
    enabled?: boolean;
    offset_minutes?: number;
    subject?: string;
    html?: string;
    text_fallback?: string;
    reminder_key?: string | null;
  };

  // Only include fields that were actually provided (prevents overwriting with undefined/null accidentally)
  const updates: Record<string, any> = {};
  if (enabled !== undefined) updates.enabled = enabled;
  if (offset_minutes !== undefined) updates.offset_minutes = offset_minutes;
  if (subject !== undefined) updates.subject = subject;
  if (html !== undefined) updates.html = html;
  if (text_fallback !== undefined) updates.text_fallback = text_fallback;
  if (reminder_key !== undefined) updates.reminder_key = reminder_key;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("keap_call_event_slots")
    .update(updates)
    .eq("event_id", eventId)
    .eq("slot_index", slotIndex)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ slot: data });
}