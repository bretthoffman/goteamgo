import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type Ctx = { params: Promise<{ id: string }> };

// Map our DB call_type to the keys used in Apps Script TEMPLATE_MAP (which has description_copy for these four).
function callTypeForScript(callType: string): string {
  const t = (callType || "").trim();
  if (t === "Copy Clinic") return "Copy Call";
  if (t === "Mastery Day Call") return "Mastery Day";
  return t;
}

export async function POST(_req: Request, context: Ctx) {
  try {
    const sb = supabaseServer();
    const { id: eventId } = await context.params;

    const { data: event, error: e1 } = await sb
      .from("keap_call_events")
      .select("id, title, call_type, start_at, event_kind, parent_event_id")
      .eq("id", eventId)
      .single();

    if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 400 });
    if (!event) return NextResponse.json({ ok: false, error: "Event not found" }, { status: 404 });

    if ((event.event_kind ?? "call") !== "description_copy") {
      return NextResponse.json(
        { ok: false, error: "Only description_copy events can create description copy docs" },
        { status: 400 }
      );
    }

    const callType = event.call_type;
    const startAt = event.parent_event_id
      ? (await sb.from("keap_call_events").select("start_at").eq("id", event.parent_event_id).single()).data?.start_at ?? event.start_at
      : event.start_at;

    const { data: slot, error: eSlot } = await sb
      .from("keap_call_event_slots")
      .select("*")
      .eq("event_id", eventId)
      .eq("slot_index", 1)
      .single();

    if (eSlot) return NextResponse.json({ ok: false, error: eSlot.message }, { status: 400 });
    if (!slot) return NextResponse.json({ ok: false, error: "Slot 1 not found" }, { status: 404 });

    if (slot.doc_id && slot.doc_url) {
      return NextResponse.json({ ok: true, event, slot });
    }

    const scriptUrl = process.env.GDOC_COPY_WEBAPP_URL;
    const secret = process.env.GDOC_COPY_SECRET;
    if (!scriptUrl) {
      return NextResponse.json({ ok: false, error: "Missing GDOC_COPY_WEBAPP_URL" }, { status: 500 });
    }
    if (!secret) {
      return NextResponse.json({ ok: false, error: "Missing GDOC_COPY_SECRET" }, { status: 500 });
    }

    // Same payload shape as create-doc: script uses reminder_key + call_type to pick template and builds name from labelForReminderKey_("description_copy") => "Description Copy"
    const payloadObj = {
      secret,
      event_id: eventId,
      slot_index: 1,
      reminder_key: "description_copy",
      call_type: callTypeForScript(callType),
      start_at: startAt,
      title: event.title,
    };

    const json = JSON.stringify(payloadObj);
    const b64 = Buffer.from(json, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");

    const url = `${scriptUrl}?payload=${encodeURIComponent(b64)}`;

    let doc_id: string | null = null;
    let doc_url: string | null = null;

    try {
      const r = await fetch(url, { method: "GET" });
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
          { ok: false, error: "Response missing doc_id/doc_url", details: data },
          { status: 400 }
        );
      }
    } catch (err: any) {
      return NextResponse.json(
        { ok: false, error: "Doc create request failed", details: err?.message ?? String(err) },
        { status: 500 }
      );
    }

    const { data: updatedSlot, error: e2 } = await sb
      .from("keap_call_event_slots")
      .update({ doc_id, doc_url, enabled: true })
      .eq("event_id", eventId)
      .eq("slot_index", 1)
      .select("*")
      .single();

    if (e2) return NextResponse.json({ ok: false, error: e2.message }, { status: 400 });

    return NextResponse.json({ ok: true, event, slot: updatedSlot });
  } catch (e: any) {
    console.error("create-description-doc failed:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}
