import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import crypto from "crypto";

function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, fullDayRate, halfDayRate } = body ?? {};

    if (
      !name ||
      !email ||
      typeof name !== "string" ||
      typeof email !== "string" ||
      !password ||
      typeof password !== "string"
    ) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid fields." },
        { status: 400 }
      );
    }

    const fullDay = Number(fullDayRate);
    const halfDay = Number(halfDayRate);

    if (!Number.isFinite(fullDay) || !Number.isFinite(halfDay)) {
      return NextResponse.json(
        { ok: false, error: "Rates must be valid numbers." },
        { status: 400 }
      );
    }

    const sb = supabaseServer();

    const password_hash = hashPassword(password);

    const { data, error } = await sb
      .from("production_contractors")
      .insert([
        {
          name,
          email,
          password_hash,
          full_day_rate: fullDay,
          half_day_rate: halfDay,
        },
      ])
      .select("id, name, email, full_day_rate, half_day_rate")
      .single();

    if (error) {
      // Unique violation on email
      if ((error as any).code === "23505") {
        return NextResponse.json(
          { ok: false, error: "Email already exists." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, contractor: data }, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/production/contractors/register failed:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}

