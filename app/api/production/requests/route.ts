import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type DbRequestRow = {
  id: string;
  event_id: string;
  contractor_email: string;
  status: string;
  requested_at: string;
  payload: any;
};

export async function GET() {
  try {
    const sb = supabaseServer();

    const { data, error } = await sb
      .from("production_requests")
      .select("id, event_id, contractor_email, status, requested_at, payload")
      .order("requested_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ requests: (data ?? []) as DbRequestRow[] });
  } catch (e: any) {
    console.error("GET /api/production/requests failed:", e);
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

    const b = body as any;
    const id = b.id as string | undefined;
    const eventId = b.eventId as string | undefined;
    const contractorEmail = b.contractorEmail as string | undefined;
    const status = (b.status as string | undefined) ?? "pending";
    const requestedAt = (b.requestedAt as string | undefined) ?? new Date().toISOString();

    if (!eventId) {
      return NextResponse.json(
        { ok: false, error: "Missing eventId" },
        { status: 400 }
      );
    }
    if (!contractorEmail) {
      return NextResponse.json(
        { ok: false, error: "Missing contractorEmail" },
        { status: 400 }
      );
    }

    const sb = supabaseServer();
    const payload = b;

    if (id) {
      const { data, error } = await sb
        .from("production_requests")
        .update({
          event_id: eventId,
          contractor_email: contractorEmail,
          status,
          requested_at: requestedAt,
          payload,
        })
        .eq("id", id)
        .select("id, event_id, contractor_email, status, requested_at, payload")
        .single();

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true, request: data });
    }

    const { data, error } = await sb
      .from("production_requests")
      .insert({
        event_id: eventId,
        contractor_email: contractorEmail,
        status,
        requested_at: requestedAt,
        payload,
      })
      .select("id, event_id, contractor_email, status, requested_at, payload")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, request: data });
  } catch (e: any) {
    console.error("POST /api/production/requests failed:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}

