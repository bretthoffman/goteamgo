import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type DbEventRow = {
  id: string;
  title: string;
  client: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  event_json: any;
};

export async function GET() {
  try {
    const sb = supabaseServer();

    const { data, error } = await sb
      .from("production_events")
      .select("id, title, client, start_date, end_date, location, event_json")
      .order("start_date", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ events: (data ?? []) as DbEventRow[] });
  } catch (e: any) {
    console.error("GET /api/production/events failed:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      id,
      title,
      client = null,
      startDate,
      endDate,
      location = null,
      ...rest
    } = body as any;

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid title" },
        { status: 400 }
      );
    }

    const start_date =
      typeof startDate === "string" && startDate.trim()
        ? startDate.trim()
        : new Date().toISOString().slice(0, 10);

    const end_date =
      typeof endDate === "string" && endDate.trim()
        ? endDate.trim()
        : null;

    const event_json = { id, title, client, startDate: start_date, endDate: end_date ?? "", location, ...rest };

    const sb = supabaseServer();

    if (id) {
      const { data, error } = await sb
        .from("production_events")
        .update({
          title,
          client,
          start_date,
          end_date,
          location,
          event_json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("id, title, client, start_date, end_date, location, event_json")
        .single();

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true, event: data });
    }

    const { data, error } = await sb
      .from("production_events")
      .insert({
        title,
        client,
        start_date,
        end_date,
        location,
        event_json,
      })
      .select("id, title, client, start_date, end_date, location, event_json")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, event: data });
  } catch (e: any) {
    console.error("POST /api/production/events failed:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}

