"use client";

import { useMemo, useState } from "react";

type TagRow = { id: number; name: string };
type ContactRow = { id: number; name: string; email: string };

export default function Home() {
  // LEFT: existing test button
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState("");

  // RIGHT: tag search + contacts
  const [loadingTags, setLoadingTags] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [error, setError] = useState("");

  const [tags, setTags] = useState<TagRow[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);

  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [contactsCount, setContactsCount] = useState<number | null>(null);

  const selectedTag = useMemo(
    () => tags.find((t) => t.id === selectedTagId) ?? null,
    [tags, selectedTagId]
  );

  async function handleSendTestEmail() {
    setSending(true);
    setSendResult("");
    try {
      const res = await fetch("/api/keap-test", { method: "POST" });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setSendResult(res.ok ? `✅ ${data.message ?? "Success"}` : `❌ ${JSON.stringify(data, null, 2)}`);
    } catch (e: any) {
      setSendResult(`❌ ${e?.message ?? String(e)}`);
    } finally {
      setSending(false);
    }
  }

  function clearSearch() {
    setError("");
    setTags([]);
    setSelectedTagId(null);
    setContacts([]);
    setContactsCount(null);
    setLoadingTags(false);
    setLoadingContacts(false);
  }

  async function loadTags() {
    setError("");
    setLoadingTags(true);
    setTags([]);
    setSelectedTagId(null);
    setContacts([]);
    setContactsCount(null);

    try {
      const res = await fetch("/api/keap/tags", { method: "GET" });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok || !data.ok) {
        setError(data?.error ?? "Failed to load tags");
        return;
      }
      setTags(data.tags ?? []);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoadingTags(false);
    }
  }

  async function loadContactsForTag(tagId: number) {
    setError("");
    setLoadingContacts(true);
    setContacts([]);
    setContactsCount(null);
  
    try {
      const url = `/api/keap/contacts-by-tag?tagId=${tagId}`;
      const res = await fetch(url, { method: "GET" });
  
      const text = await res.text();
  
      // If we got HTML, show status + a snippet so we know what it is
      if (text.trim().startsWith("<")) {
        setError(
          `Contacts endpoint returned HTML (status ${res.status}). ` +
            `URL: ${url}\n\n` +
            text.slice(0, 300)
        );
        return;
      }
  
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setError(`Contacts endpoint returned non-JSON (status ${res.status}). Raw:\n${text.slice(0, 300)}`);
        return;
      }
  
      if (!res.ok || !data.ok) {
        setError(data?.error ?? `Failed to load contacts (status ${res.status}).`);
        return;
      }
  
      setContactsCount(data.count ?? 0);
      setContacts(data.contacts ?? []);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoadingContacts(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>Keap Controls</h1>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* LEFT PANEL */}
        <section style={{ width: "45%", minWidth: 360, border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Test</h2>

          <button
            onClick={handleSendTestEmail}
            disabled={sending}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ccc",
              cursor: sending ? "not-allowed" : "pointer",
              background: "white",
            }}
          >
            {sending ? "Sending..." : "Send Test Email"}
          </button>

          {sendResult && <pre style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{sendResult}</pre>}
        </section>

        {/* RIGHT PANEL */}
        <section style={{ width: "55%", minWidth: 420, border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Search / Query</h2>

            <button
              onClick={clearSearch}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #ccc",
                cursor: "pointer",
                background: "white",
              }}
            >
              Clear
            </button>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={loadTags}
              disabled={loadingTags}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ccc",
                cursor: loadingTags ? "not-allowed" : "pointer",
                background: "white",
              }}
            >
              {loadingTags ? "Loading tags..." : "Search by tag"}
            </button>

            {selectedTag ? (
              <div style={{ fontSize: 13, opacity: 0.8 }}>
                Selected: <b>{selectedTag.name}</b>
              </div>
            ) : (
              <div style={{ fontSize: 13, opacity: 0.6 }}>Select a tag to load contacts</div>
            )}
          </div>

          {error && (
            <pre style={{ marginTop: 12, whiteSpace: "pre-wrap", color: "#b00020" }}>
              ❌ {error}
            </pre>
          )}

          {/* TAG LIST */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
              Tags {tags.length ? `(${tags.length})` : ""}
            </div>

            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: 10,
                height: 220,
                overflowY: "auto",
                padding: 8,
                background: "white",
              }}
            >
              {!tags.length && <div style={{ opacity: 0.6, fontSize: 13 }}>Click “Search by tag” to load tags.</div>}

              {tags.map((t) => {
                const active = t.id === selectedTagId;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTagId(t.id);
                      loadContactsForTag(t.id);
                    }}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      cursor: "pointer",
                      background: active ? "#f2f2f2" : "transparent",
                      fontSize: 13,
                      userSelect: "none",
                    }}
                    title={`Tag ID: ${t.id}`}
                  >
                    {t.name}
                  </div>
                );
              })}
            </div>
          </div>

          {/* CONTACT LIST */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                Contacts {contactsCount !== null ? `(${contactsCount})` : ""}
              </div>
              {loadingContacts && <div style={{ fontSize: 12, opacity: 0.7 }}>Loading contacts…</div>}
            </div>

            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: 10,
                height: 220,
                overflowY: "auto",
                padding: 8,
                marginTop: 6,
                background: "white",
              }}
            >
              {!selectedTag && <div style={{ opacity: 0.6, fontSize: 13 }}>Select a tag to load contacts.</div>}

              {selectedTag && !loadingContacts && contacts.length === 0 && (
                <div style={{ opacity: 0.6, fontSize: 13 }}>No contacts found for that tag.</div>
              )}

              {contacts.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                  title={`Contact ID: ${c.id}`}
                >
                  {c.name} – {c.email}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}