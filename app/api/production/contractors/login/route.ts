import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import crypto from "crypto";

function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body ?? {};

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing email or password." },
        { status: 400 }
      );
    }

    const sb = supabaseServer();
    const password_hash = hashPassword(password);

    const { data, error } = await sb
      .from("production_contractors")
      .select("id, name, email, full_day_rate, half_day_rate")
      .eq("email", email)
      .eq("password_hash", password_hash)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials." },
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: true, contractor: data }, { status: 200 });
  } catch (e: any) {
    console.error("POST /api/production/contractors/login failed:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}

