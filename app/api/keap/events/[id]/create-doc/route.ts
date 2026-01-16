import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: Ctx) {
  const sb = supabaseServer();
  const { id: eventId } = await context.params;

  // Optional body fields (client may send these)
  const body = await req.json().catch(() => ({}));
  const call_type = body?.call_type as string | undefined;
  const start_at = body?.start_at as string | undefined;
  const title = body?.title as string | undefined;

  // 1) Load event
  const { data: event, error: e1 } = await sb
    .from("keap_call_events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 400 });
  if (!event) return NextResponse.json({ ok: false, error: "Event not found" }, { status: 404 });

  // If already created, just return existing
  if (event.doc_id && event.doc_url) {
    return NextResponse.json({ ok: true, event });
  }

  // 2) Call Apps Script “copy template doc” endpoint
  const scriptUrl = process.env.GDOC_CREATE_SCRIPT_URL;
  const secret = process.env.GDOC_COPY_SECRET;

  if (!scriptUrl) {
    return NextResponse.json({ ok: false, error: "Missing GDOC_CREATE_SCRIPT_URL env var" }, { status: 500 });
  }
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Missing GDOC_COPY_SECRET env var" }, { status: 500 });
  }

  // Build payload
  const safeTitle = title ?? event.title ?? "Call Event";
  const payload = {
    secret: process.env.GDOC_COPY_SECRET,
    event_id: eventId,
    call_type: call_type ?? event.call_type,
    start_at: start_at ?? event.start_at,
    title: safeTitle,
  };

  let doc_id: string | null = null;
  let doc_url: string | null = null;

  try {
    // Apps Script expects: POST body JSON, plus ?secret=...
    const r = await fetch(`${scriptUrl}?secret=${encodeURIComponent(secret)}`, {
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

  // 3) Save onto the event row
  const { data: updated, error: e2 } = await sb
    .from("keap_call_events")
    .update({ doc_id, doc_url })
    .eq("id", eventId)
    .select("*")
    .single();

  if (e2) return NextResponse.json({ ok: false, error: e2.message }, { status: 400 });

  return NextResponse.json({ ok: true, event: updated });
}