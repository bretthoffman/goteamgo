import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type Ctx = { params: Promise<{ id: string }> };

function isEligibleForPostEvent(title: string): boolean {
  const t = (title || "").trim();
  if (/^30-30-30\s+call$/i.test(t)) return false;
  if (/obvio\s+q&a/i.test(t)) return false;
  return true;
}

function postEventTitleFromOriginal(originalTitle: string): string {
  const t = (originalTitle || "").trim();
  if (/^\s*$/.test(t)) return "Description Copy";
  if (/call\s*$/i.test(t)) return t.replace(/\s*call\s*$/i, "").trim() + " Description Copy";
  return t + " Description Copy";
}

export async function POST(_req: Request, context: Ctx) {
  try {
    const sb = supabaseServer();
    const { id: eventId } = await context.params;

    const { data: original, error: e0 } = await sb
      .from("keap_call_events")
      .select("id, title, call_type, start_at, end_at, post_event_event_id, event_kind")
      .eq("id", eventId)
      .single();

    if (e0) return NextResponse.json({ error: e0.message }, { status: 400 });
    if (!original) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    if ((original.event_kind ?? "call") !== "call") {
      return NextResponse.json(
        { error: "Only call events can have a post-event" },
        { status: 400 }
      );
    }

    const startAt = new Date(original.start_at);
    if (startAt.getTime() >= Date.now()) {
      return NextResponse.json(
        { error: "Post-event is only for past events" },
        { status: 400 }
      );
    }

    if (!isEligibleForPostEvent(original.title)) {
      return NextResponse.json(
        { error: "This call type is not eligible for post-event copy review" },
        { status: 400 }
      );
    }

    if (original.post_event_event_id) {
      const { data: existing } = await sb
        .from("keap_call_events")
        .select("*")
        .eq("id", original.post_event_event_id)
        .single();
      return NextResponse.json({
        ok: true,
        post_event_event_id: original.post_event_event_id,
        event: existing,
      });
    }

    const postTitle = postEventTitleFromOriginal(original.title);
    const endAt = original.end_at ? new Date(original.end_at) : new Date(startAt.getTime() + 60 * 60 * 1000);
    const postStart = new Date(endAt.getTime() + 60 * 1000);
    const postEnd = new Date(postStart.getTime() + 30 * 60 * 1000);

    const { data: postEvent, error: e1 } = await sb
      .from("keap_call_events")
      .insert({
        title: postTitle,
        call_type: original.call_type,
        start_at: postStart.toISOString(),
        end_at: postEnd.toISOString(),
        event_kind: "description_copy",
        parent_event_id: original.id,
      })
      .select("*")
      .single();

    if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });
    if (!postEvent) return NextResponse.json({ error: "Failed to create post-event" }, { status: 500 });

    const { error: e2 } = await sb
      .from("keap_call_event_slots")
      .insert({
        event_id: postEvent.id,
        slot_index: 1,
        enabled: false,
        offset_minutes: 0,
        subject: "",
        preview_line: "",
        html: "",
        text_fallback: "",
      });

    if (e2) {
      await sb.from("keap_call_events").delete().eq("id", postEvent.id);
      return NextResponse.json({ error: e2.message }, { status: 400 });
    }

    const { error: e3 } = await sb
      .from("keap_call_events")
      .update({
        post_event_event_id: postEvent.id,
        post_event_enabled: false,
      })
      .eq("id", original.id);

    if (e3) {
      await sb.from("keap_call_events").delete().eq("id", postEvent.id);
      return NextResponse.json({ error: e3.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      post_event_event_id: postEvent.id,
      event: postEvent,
    });
  } catch (e: any) {
    console.error("ensure-post-event failed:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}
