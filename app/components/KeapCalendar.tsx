"use client";

import React, { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { DateSelectArg, EventClickArg } from "@fullcalendar/interaction";

type DbEvent = {
  id: string;
  title: string;
  call_type: string;
  start_at: string;
  end_at: string | null;
};

type CalEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
};

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return { __empty: true };
  try {
    return JSON.parse(text);
  } catch {
    return { __parseError: true, raw: text.slice(0, 500) };
  }
}

export default function KeapCalendar() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<string>("");

  // modal state
  const [open, setOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("Ask Us Anything Call");
  const [draftCallType, setDraftCallType] = useState("Ask Us Anything");
  const [draftStartISO, setDraftStartISO] = useState<string>("");

  const calendarEvents = useMemo(() => events, [events]);

  async function loadRange(startISO?: string, endISO?: string) {
    setLoading(true);
    setBanner("");
    try {
      const qs =
        startISO && endISO
          ? `?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`
          : "";
      const res = await fetch(`/api/keap/events${qs}`, { method: "GET" });

      const data = await safeJson(res);

      if (!res.ok) {
        setBanner(
          `✖ Failed to load events (HTTP ${res.status}). ${
            data?.error ? data.error : data?.raw ? data.raw : ""
          }`
        );
        setEvents([]);
        return;
      }

      if (data.__empty) {
        setBanner("✖ /api/keap/events returned an empty response body.");
        setEvents([]);
        return;
      }

      if (data.__parseError) {
        setBanner(`✖ /api/keap/events returned non-JSON:\n${data.raw}`);
        setEvents([]);
        return;
      }

      const rows: DbEvent[] = data.events ?? [];
      setEvents(
        rows.map((r) => ({
          id: r.id,
          title: r.title,
          start: r.start_at,
          end: r.end_at ?? undefined,
        }))
      );
    } catch (e: any) {
      setBanner(`✖ Failed to load events: ${e?.message ?? String(e)}`);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // initial load (no range)
    loadRange();
  }, []);

  function onSelect(info: DateSelectArg) {
    // Open modal instead of prompt
    setDraftStartISO(info.startStr);
    setDraftTitle("Ask Us Anything Call");
    setDraftCallType("Ask Us Anything");
    setOpen(true);
  }

  async function createEvent() {
    setBanner("");
    try {
      const payload = {
        title: draftTitle.trim(),
        call_type: draftCallType,
        start_at: draftStartISO,
        end_at: null,
      };

      const res = await fetch("/api/keap/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        setBanner(
          `✖ Create failed (HTTP ${res.status}). ${
            data?.error ? data.error : data?.raw ? data.raw : ""
          }`
        );
        return;
      }

      if (data.__empty) {
        setBanner("✖ Create failed: API returned empty response body.");
        return;
      }

      if (data.__parseError) {
        setBanner(`✖ Create failed: API returned non-JSON:\n${data.raw}`);
        return;
      }

      setOpen(false);
      // reload to reflect DB state
      await loadRange();
      setBanner("✔ Event created");
    } catch (e: any) {
      setBanner(`✖ Create failed: ${e?.message ?? String(e)}`);
    }
  }

  async function deleteEvent(arg: EventClickArg) {
    const ok = confirm(`Delete "${arg.event.title}"?`);
    if (!ok) return;

    setBanner("");
    try {
      const res = await fetch(`/api/keap/events/${arg.event.id}`, { method: "DELETE" });
      const data = await safeJson(res);

      if (!res.ok) {
        setBanner(
          `✖ Delete failed (HTTP ${res.status}). ${
            data?.error ? data.error : data?.raw ? data.raw : ""
          }`
        );
        return;
      }

      await loadRange();
      setBanner("✔ Deleted");
    } catch (e: any) {
      setBanner(`✖ Delete failed: ${e?.message ?? String(e)}`);
    }
  }

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, opacity: 0.9 }}>
          Calendar
        </div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>{loading ? "Loading…" : `${events.length} events`}</div>
      </div>

      {banner && (
        <pre style={{ margin: "0 0 10px 0", whiteSpace: "pre-wrap", color: banner.startsWith("✔") ? "#6ee7b7" : "#ff6b6b" }}>
          {banner}
        </pre>
      )}

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        height={600}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        selectable
        selectMirror
        select={onSelect}
        events={calendarEvents}
        eventClick={deleteEvent}
      />

      {/* simple modal */}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              width: 420,
              background: "#0b0b0b",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 14,
              padding: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Create Call Event</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Title</div>
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "transparent",
                    color: "white",
                  }}
                />
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Call Type</div>
                <select
                  value={draftCallType}
                  onChange={(e) => setDraftCallType(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "#0b0b0b",
                    color: "white",
                  }}
                >
                  <option>Ask Us Anything</option>
                  <option>Copy Call</option>
                  <option>Jimbo Call</option>
                  <option>Mastery Day</option>
                  <option>Obvio Q&amp;A</option>
                </select>
              </div>

              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Start: {draftStartISO}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "transparent",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={createEvent}
                  disabled={!draftTitle.trim()}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: !draftTitle.trim() ? "rgba(255,255,255,0.08)" : "white",
                    color: !draftTitle.trim() ? "rgba(255,255,255,0.6)" : "#111",
                    cursor: !draftTitle.trim() ? "not-allowed" : "pointer",
                    fontWeight: 700,
                  }}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}