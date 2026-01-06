import { NextResponse } from "next/server";

const BASE_URL = "https://api.infusionsoft.com/crm/rest/v2";

type KeapTag = { id: number; name: string };

export async function GET() {
  const token = process.env.KEAP_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing KEAP_ACCESS_TOKEN" }, { status: 500 });
  }

  try {
    const all: KeapTag[] = [];
    let nextUrl: string | null = `${BASE_URL}/tags?limit=100`;

    while (nextUrl) {
      const resp = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const text = await resp.text();
      if (!resp.ok) {
        return NextResponse.json(
          { ok: false, error: `Keap tags fetch failed (${resp.status})`, body: text },
          { status: 500 }
        );
      }

      const data = JSON.parse(text);
      const tags = (data.tags ?? []) as KeapTag[];
      for (const t of tags) all.push({ id: t.id, name: t.name });

      nextUrl = typeof data.next === "string" ? data.next : null;
    }

    all.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ ok: true, tags: all });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}