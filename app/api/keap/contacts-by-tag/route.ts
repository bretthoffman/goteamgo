import { NextResponse } from "next/server";

const BASE_URL = "https://api.infusionsoft.com/crm/rest/v2";

type KeapContact = {
  id: number;
  given_name?: string;
  family_name?: string;
  email_addresses?: { email: string; field?: string }[];
};

function buildName(c: KeapContact): string {
  const gn = (c.given_name ?? "").trim();
  const fn = (c.family_name ?? "").trim();
  const name = `${gn} ${fn}`.trim();
  return name || "(No name)";
}

function extractEmail(c: KeapContact): string {
  const emails = Array.isArray(c.email_addresses) ? c.email_addresses : [];
  const firstNonEmpty = emails.find((e) => e?.email && e.email.trim().length > 0)?.email;
  return firstNonEmpty ?? "(No email)";
}

export async function GET(req: Request) {
  const token = process.env.KEAP_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing KEAP_ACCESS_TOKEN" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const tagIdRaw = searchParams.get("tagId");
  const tagId = Number(tagIdRaw);

  if (!tagIdRaw || Number.isNaN(tagId)) {
    return NextResponse.json({ ok: false, error: "Provide ?tagId=<number>" }, { status: 400 });
  }

  try {
    const results: { id: number; name: string; email: string }[] = [];

    // IMPORTANT: ask Keap to include email addresses in the contact payload
    let nextUrl: string | null = `${BASE_URL}/contacts?tag_id=${encodeURIComponent(
      String(tagId)
    )}&limit=100&optional_properties=email_addresses`;

    while (nextUrl) {
      const resp = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store",
      });

      const text = await resp.text();
      if (!resp.ok) {
        return NextResponse.json(
          { ok: false, error: `Keap contacts fetch failed (${resp.status})`, body: text },
          { status: 500 }
        );
      }

      const data = JSON.parse(text);
      const contacts = (data.contacts ?? []) as KeapContact[];

      for (const c of contacts) {
        if (!c?.id) continue;

        results.push({
          id: c.id,
          name: buildName(c),
          email: extractEmail(c),
        });
      }

      nextUrl = typeof data.next === "string" ? data.next : null;
    }

    results.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ ok: true, count: results.length, contacts: results });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}