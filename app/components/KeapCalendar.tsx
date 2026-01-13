"use client";

import React, { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

type CalEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
};

export default function KeapCalendar() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  // create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftCallType, setDraftCallType] = useState("AUA");
  const [draftStart, setDraftStart] = useState<string>("");
  const [draftEnd, setDraftEnd] = useState<string>("");

  // ----------------------------
  // LOAD EVENTS
  // ----------------------------
  async function loadEvents(start?: string, end?: string) {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (start) params.set("start", start);
      if (end) params.set("end", end);

      const res = await fetch(`/api/keap/events?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error ?? "Failed to load events");

      setEvents(
        (data.events ?? []).map((e: any) => ({
          id: String(e.id),
          title: e.title,
          start: e.start_at,
          end: e.end_at ?? undefined,
        }))
      );
    } catch (err: any) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  // ----------------------------
  // CREATE EVENT
  // ----------------------------
  async function createEvent(payload: {
    title: string;
    call_type: string;
    start_at: string;
    end_at?: string;
  }) {
    try {
      setError(null);
      const res = await fetch("/api/keap/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Create failed");

      await loadEvents();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }

  // ----------------------------
  // RENDER
  // ----------------------------
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.9 }}>Calendar</div>
        {error && <div style={{ color: "#ff6b6b", fontSize: 12 }}>❌ {error}</div>}
      </div>

      {/* CREATE MODAL */}
      {createOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              width: 520,
              maxWidth: "100%",
              background: "#111",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 14,
              padding: 16,
              color: "white",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>
              Create Call Event
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6, fontSize: 12 }}>
                Title
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="Ask Us Anything Call"
                  style={inputStyle}
                />
              </label>

              <label style={{ display: "grid", gap: 6, fontSize: 12 }}>
                Call Type
                <select
                  value={draftCallType}
                  onChange={(e) => setDraftCallType(e.target.value)}
                  style={inputStyle}
                >
                  <option value="AUA">Ask Us Anything</option>
                  <option value="COPY">Copy Call</option>
                  <option value="JIMBO">Jimbo Call</option>
                  <option value="MASTERY">Mastery Day</option>
                  <option value="OBVIO">Obvio Q&amp;A</option>
                </select>
              </label>

              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Start: {draftStart && new Date(draftStart).toLocaleString()}
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setCreateOpen(false)} style={ghostBtn}>
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!draftTitle.trim()) return;
                    await createEvent({
                      title: draftTitle,
                      call_type: draftCallType,
                      start_at: draftStart,
                      end_at: draftEnd || undefined,
                    });
                    setCreateOpen(false);
                  }}
                  style={primaryBtn}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        height={600}
        selectable
        events={events}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        select={(info) => {
          setDraftTitle("");
          setDraftCallType("AUA");
          setDraftStart(info.start.toISOString());
          setDraftEnd(info.end ? info.end.toISOString() : "");
          setCreateOpen(true);
        }}
      />
    </div>
  );
}

// ----------------------------
// styles
// ----------------------------
const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  outline: "none",
};

const ghostBtn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "transparent",
  color: "white",
  cursor: "pointer",
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "white",
  color: "black",
  cursor: "pointer",
  fontWeight: 700,
};