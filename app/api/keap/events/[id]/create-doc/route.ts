import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: Ctx) {
  const sb = supabaseServer();
  const { id: eventId } = await context.params;

  const body = await req.json().catch(() => ({}));

  const slot_index = Number(body?.slot_index);
  const reminder_key = (body?.reminder_key as string | undefined) ?? null;

  if (![1, 2, 3].includes(slot_index)) {
    return NextResponse.json(
      { ok: false, error: "Missing/invalid slot_index (must be 1, 2, or 3)" },
      { status: 400 }
    );
  }

  // 1) Load event (we need call_type/start_at/title for doc naming & template selection)
  const { data: event, error: e1 } = await sb
    .from("keap_call_events")
    .select("id,title,call_type,start_at")
    .eq("id", eventId)
    .single();

  if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 400 });
  if (!event) return NextResponse.json({ ok: false, error: "Event not found" }, { status: 404 });

  // 2) Load slot (to prevent double-create)
  const { data: slot, error: eSlot } = await sb
    .from("keap_call_event_slots")
    .select("*")
    .eq("event_id", eventId)
    .eq("slot_index", slot_index)
    .single();

  if (eSlot) return NextResponse.json({ ok: false, error: eSlot.message }, { status: 400 });
  if (!slot) return NextResponse.json({ ok: false, error: "Slot not found" }, { status: 404 });

  if (slot.doc_id && slot.doc_url) {
    // Already created -> return as-is
    return NextResponse.json({ ok: true, event, slot });
  }
  // 3) Call Apps Script “copy template doc” endpoint
  const scriptUrl = process.env.GDOC_COPY_WEBAPP_URL;
  const secret = process.env.GDOC_COPY_SECRET;

  if (!scriptUrl) {
    return NextResponse.json({ ok: false, error: "Missing GDOC_COPY_WEBAPP_URL env var" }, { status: 500 });
  }
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Missing GDOC_COPY_SECRET env var" }, { status: 500 });
  }

  // IMPORTANT: your Apps Script now authenticates via body.secret, not query params
  const payload = {
    secret,
    event_id: eventId,
    slot_index,
    reminder_key, // optional but recommended
    call_type: event.call_type,
    start_at: event.start_at,
    title: event.title,
  };

  let doc_id: string | null = null;
  let doc_url: string | null = null;

  try {
    const r = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await r.json().catch(() => null);

    if (!r.ok || !data?.ok) {
      return NextResponse.json(
        { ok: false, error: `Doc create failed (HTTP ${r.status})`, details: data },
        { status: 400 }
      );
    }

    doc_id = data?.doc_id ?? null;
    doc_url = data?.doc_url ?? null;

    if (!doc_id || !doc_url) {
      return NextResponse.json(
        { ok: false, error: "Doc create succeeded but response missing doc_id/doc_url", details: data },
        { status: 400 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "Doc create request failed", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }

  // 4) Save doc onto the SLOT row (not the event)
  const { data: updatedSlot, error: e2 } = await sb
    .from("keap_call_event_slots")
    .update({
      doc_id,
      doc_url,
      ...(reminder_key ? { reminder_key } : {}),
    })
    .eq("event_id", eventId)
    .eq("slot_index", slot_index)
    .select("*")
    .single();

  if (e2) return NextResponse.json({ ok: false, error: e2.message }, { status: 400 });

  return NextResponse.json({ ok: true, event, slot: updatedSlot });
}