import { NextResponse } from "next/server";

const BASE_URL = "https://api.infusionsoft.com/crm/rest/v1";

export async function POST() {
  const token = process.env.KEAP_ACCESS_TOKEN;
  const contactId = process.env.KEAP_CONTACT_ID;
  const tagId = process.env.KEAP_TEST_TAG_ID;

  if (!token || !contactId || !tagId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing env vars. Set KEAP_ACCESS_TOKEN, KEAP_CONTACT_ID, KEAP_TEST_TAG_ID in .env.local",
      },
      { status: 500 }
    );
  }

  const url = `${BASE_URL}/contacts/${encodeURIComponent(contactId)}/tags`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ tagIds: [Number(tagId)] }),
  });

  const text = await resp.text();

  if (!resp.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Keap request failed",
        status: resp.status,
        body: text,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: `Applied tag ${tagId} to contact ${contactId}. Keap campaign should fire.`,
  });
}