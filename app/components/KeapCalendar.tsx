"use client";

import React, { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

type SlotIndex = 1 | 2 | 3;

type ReminderSlot = {
  slot: SlotIndex;
  enabled: boolean;
  // offset in minutes BEFORE event start (ex: 15, 60*24, etc)
  offsetMinutes: number;
  subjectHtml: string; // optional (can keep as plain text if you want)
  bodyHtml: string; // main HTML content
};

type DbEvent = {
  id: string;
  title: string;
  start: string; // ISO
  end?: string | null;
  allDay?: boolean | null;

  // optional metadata
  callType?: string | null;

  // 3 slots
  slots: ReminderSlot[];
};

type FcEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
};

const API_BASE = "/api/keap/events";

const DEFAULT_SLOTS: ReminderSlot[] = [
  { slot: 1, enabled: true, offsetMinutes: 24 * 60, subjectHtml: "", bodyHtml: "" }, // 24h before
  { slot: 2, enabled: true, offsetMinutes: 6 * 60, subjectHtml: "", bodyHtml: "" },  // morning-of-ish default
  { slot: 3, enabled: true, offsetMinutes: 15, subjectHtml: "", bodyHtml: "" },      // 15 min before (your default)
];

function clampToQuarterHour(mins: number) {
  const snapped = Math.round(mins / 15) * 15;
  return Math.max(0, snapped);
}

function offsetToUiParts(offsetMinutes: number) {
  // Represent as "H:MM AM/PM" *relative* editor is tricky.
  // For now, you asked: hour 1-12, minutes 00/15/30/45, AM/PM
  // We'll store ONLY offsetMinutes in DB, but give a simple UI:
  // - "X minutes before" quick dropdown
  // - and "custom" via quarter-hour minutes.
  const snapped = clampToQuarterHour(offsetMinutes);
  return { snapped };
}

export default function KeapCalendar() {
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // editor modal state
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<DbEvent | null>(null);
  const [saving, setSaving] = useState(false);

  const calendarEvents: FcEvent[] = useMemo(() => {
    return events.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end ?? undefined,
      allDay: !!e.allDay,
    }));
  }, [events]);

  async function loadEvents() {
    setErr("");
    setLoading(true);
    try {
      const res = await fetch(API_BASE, { method: "GET" });
      const text = await res.text();

      if (text.trim().startsWith("<")) {
        setErr(`Events endpoint returned HTML (status ${res.status}).\n${text.slice(0, 250)}`);
        return;
      }

      const data = text ? JSON.parse(text) : {};
      if (!res.ok || !data.ok) {
        setErr(data?.error ?? "Failed to load events");
        return;
      }
      setEvents(data.events ?? []);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  async function createEvent(payload: Partial<DbEvent>) {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok || !data.ok) throw new Error(data?.error ?? "Create failed");
    return data.event as DbEvent;
  }

  async function patchEvent(eventId: string, patch: Partial<DbEvent>) {
    const res = await fetch(`${API_BASE}/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok || !data.ok) throw new Error(data?.error ?? "Update failed");
    return data.event as DbEvent;
  }

  async function deleteEvent(eventId: string) {
    const res = await fetch(`${API_BASE}/${eventId}`, { method: "DELETE" });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok || !data.ok) throw new Error(data?.error ?? "Delete failed");
  }

  function openEditor(evt: DbEvent) {
    setActive(structuredClone(evt));
    setOpen(true);
  }

  function closeEditor() {
    setOpen(false);
    setActive(null);
    setErr("");
  }

  async function saveEditor() {
    if (!active) return;
    setSaving(true);
    setErr("");
    try {
      const updated = await patchEvent(active.id, active);
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      closeEditor();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSaving(false);
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.9 }}>Calendar</div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          {loading ? "Loading…" : `${events.length} events`}
        </div>
      </div>

      {err && (
        <pre style={{ marginTop: 10, whiteSpace: "pre-wrap", color: "#b00020", fontSize: 12 }}>
          ❌ {err}
        </pre>
      )}

      <div style={{ marginTop: 10 }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          height={600}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          editable
          selectable
          selectMirror
          events={calendarEvents}
          select={async (info) => {
            const title = prompt("Event title?");
            if (!title) return;

            try {
              const newEvt = await createEvent({
                title,
                start: info.startStr,
                end: info.endStr || null,
                allDay: info.allDay,
                slots: structuredClone(DEFAULT_SLOTS),
              });

              setEvents((prev) => [...prev, newEvt]);
            } catch (e: any) {
              setErr(e?.message ?? String(e));
            }
          }}
          eventClick={(info) => {
            const found = events.find((e) => e.id === info.event.id);
            if (found) openEditor(found);
          }}
          eventDrop={async (info) => {
            const id = info.event.id;
            const start = info.event.start?.toISOString();
            const end = info.event.end?.toISOString() ?? null;

            if (!start) return;

            // optimistic UI
            setEvents((prev) =>
              prev.map((e) => (e.id === id ? { ...e, start, end } : e))
            );

            try {
              const updated = await patchEvent(id, { start, end });
              setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
            } catch (e: any) {
              setErr(e?.message ?? String(e));
              loadEvents(); // revert to DB truth
            }
          }}
          eventResize={async (info) => {
            const id = info.event.id;
            const start = info.event.start?.toISOString();
            const end = info.event.end?.toISOString() ?? null;

            if (!start) return;

            setEvents((prev) =>
              prev.map((e) => (e.id === id ? { ...e, start, end } : e))
            );

            try {
              const updated = await patchEvent(id, { start, end });
              setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
            } catch (e: any) {
              setErr(e?.message ?? String(e));
              loadEvents();
            }
          }}
        />
      </div>

      {/* MODAL EDITOR */}
      {open && active && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
            zIndex: 9999,
          }}
          onClick={closeEditor}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(980px, 96vw)",
              maxHeight: "90vh",
              overflow: "auto",
              background: "#0b0b0b",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 14,
              padding: 16,
              color: "white",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{active.title}</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                  Start: {new Date(active.start).toLocaleString()}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={async () => {
                    const ok = confirm(`Delete "${active.title}"?`);
                    if (!ok) return;
                    setSaving(true);
                    setErr("");
                    try {
                      await deleteEvent(active.id);
                      setEvents((prev) => prev.filter((e) => e.id !== active.id));
                      closeEditor();
                    } catch (e: any) {
                      setErr(e?.message ?? String(e));
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "transparent",
                    color: "white",
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: 0.9,
                  }}
                >
                  Delete
                </button>

                <button
                  onClick={closeEditor}
                  disabled={saving}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "transparent",
                    color: "white",
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: 0.9,
                  }}
                >
                  Cancel
                </button>

                <button
                  onClick={saveEditor}
                  disabled={saving}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "white",
                    color: "black",
                    cursor: saving ? "not-allowed" : "pointer",
                    fontWeight: 700,
                  }}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, opacity: 0.75 }}>Title</label>
                <input
                  value={active.title}
                  onChange={(e) => setActive({ ...active, title: e.target.value })}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.06)",
                    color: "white",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, opacity: 0.75 }}>Call Type (optional)</label>
                <input
                  value={active.callType ?? ""}
                  onChange={(e) => setActive({ ...active, callType: e.target.value })}
                  placeholder="Ask Us Anything / Copy Call / Jimbo / etc"
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.06)",
                    color: "white",
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: 16, fontSize: 13, fontWeight: 800, opacity: 0.9 }}>
              Reminder Slots (1–3)
            </div>

            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
              {active.slots.map((slotObj) => {
                const { snapped } = offsetToUiParts(slotObj.offsetMinutes);

                return (
                  <div
                    key={slotObj.slot}
                    style={{
                      border: "1px solid rgba(255,255,255,0.16)",
                      borderRadius: 12,
                      padding: 12,
                      background: "rgba(255,255,255,0.04)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>Slot {slotObj.slot}</div>

                      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, opacity: 0.85 }}>
                        <input
                          type="checkbox"
                          checked={slotObj.enabled}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            setActive({
                              ...active,
                              slots: active.slots.map((s) =>
                                s.slot === slotObj.slot ? { ...s, enabled } : s
                              ),
                            });
                          }}
                        />
                        Enabled
                      </label>
                    </div>

                    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "220px 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, opacity: 0.75 }}>Send offset</label>

                        <select
                          value={snapped}
                          onChange={(e) => {
                            const val = clampToQuarterHour(Number(e.target.value));
                            setActive({
                              ...active,
                              slots: active.slots.map((s) =>
                                s.slot === slotObj.slot ? { ...s, offsetMinutes: val } : s
                              ),
                            });
                          }}
                          style={{
                            width: "100%",
                            marginTop: 6,
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,0.18)",
                            background: "rgba(255,255,255,0.06)",
                            color: "white",
                          }}
                        >
                          <option value={15}>15 minutes before</option>
                          <option value={30}>30 minutes before</option>
                          <option value={45}>45 minutes before</option>
                          <option value={60}>1 hour before</option>
                          <option value={120}>2 hours before</option>
                          <option value={6 * 60}>6 hours before</option>
                          <option value={12 * 60}>12 hours before</option>
                          <option value={24 * 60}>24 hours before</option>
                          <option value={48 * 60}>48 hours before</option>
                        </select>

                        <div style={{ marginTop: 8, fontSize: 11, opacity: 0.65 }}>
                          Stored as <b>{snapped}</b> minutes before event start.
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={{ fontSize: 12, opacity: 0.75 }}>Subject (HTML or text)</label>
                          <textarea
                            value={slotObj.subjectHtml}
                            onChange={(e) => {
                              const subjectHtml = e.target.value;
                              setActive({
                                ...active,
                                slots: active.slots.map((s) =>
                                  s.slot === slotObj.slot ? { ...s, subjectHtml } : s
                                ),
                              });
                            }}
                            placeholder="Subject for this slot"
                            rows={3}
                            style={{
                              width: "100%",
                              marginTop: 6,
                              padding: "10px 12px",
                              borderRadius: 10,
                              border: "1px solid rgba(255,255,255,0.18)",
                              background: "rgba(255,255,255,0.06)",
                              color: "white",
                              resize: "vertical",
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: 12, opacity: 0.75 }}>Body HTML</label>
                          <textarea
                            value={slotObj.bodyHtml}
                            onChange={(e) => {
                              const bodyHtml = e.target.value;
                              setActive({
                                ...active,
                                slots: active.slots.map((s) =>
                                  s.slot === slotObj.slot ? { ...s, bodyHtml } : s
                                ),
                              });
                            }}
                            placeholder="Paste HTML here (this is what you will send via Keap Email API)."
                            rows={3}
                            style={{
                              width: "100%",
                              marginTop: 6,
                              padding: "10px 12px",
                              borderRadius: 10,
                              border: "1px solid rgba(255,255,255,0.18)",
                              background: "rgba(255,255,255,0.06)",
                              color: "white",
                              resize: "vertical",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {err && (
              <pre style={{ marginTop: 12, whiteSpace: "pre-wrap", color: "#ff7070", fontSize: 12 }}>
                ❌ {err}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}