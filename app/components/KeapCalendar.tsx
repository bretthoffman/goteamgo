"use client";

import React, { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg } from "@fullcalendar/core";

// ---------- Types ----------
type DbEvent = {
  id: string;
  title: string;
  call_type: string;
  start_at: string;
  end_at: string | null;
};

type DbSlot = {
  id?: string;
  event_id: string;
  slot_index: number;
  enabled: boolean;
  offset_minutes: number; // negative = before event
  subject: string;
  html: string;
  text_fallback: string;
};

type CalEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
};

// ---------- Helpers ----------
async function safeJson(
  res: Response
): Promise<any & { __empty?: boolean; __parseError?: boolean; raw?: string }> {
  const raw = await res.text();

  if (!raw || !raw.trim()) return { __empty: true, raw: "" };
  if (raw.trim().startsWith("<")) return { __parseError: true, raw };

  try {
    return JSON.parse(raw);
  } catch {
    return { __parseError: true, raw };
  }
}

const CALL_TYPES = [
  "Ask Us Anything",
  "Copy Call",
  "Jimbo Call",
  "Mastery Day",
  "Obvio Q&A",
  "30-30-30 Call",
] as const;

function defaultTitleForCallType(callType: string) {
  return `${callType} Call`;
}

function to24Hour(hour12: number, ampm: "AM" | "PM") {
  const h = hour12 % 12;
  return ampm === "PM" ? h + 12 : h;
}

/**
 * Build an ISO string from LOCAL date parts (year/month/day) and a chosen time (hour/min).
 * This is the key fix for "created day before / wrong time".
 */
function buildLocalISOFromDateParts(
  date: Date,
  hour12: number,
  minute: number,
  ampm: "AM" | "PM"
) {
  const h24 = to24Hour(hour12, ampm);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h24, minute, 0, 0);
  return d.toISOString();
}

function formatLocalPreview(date: Date, hour12: number, minute: number, ampm: "AM" | "PM") {
  const mm = String(minute).padStart(2, "0");
  return `${date.toLocaleDateString()} ${hour12}:${mm} ${ampm}`;
}

function minutesBetween(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 60000);
}

// ---------- Component ----------
export default function KeapCalendar() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<string>("");

  // range tracking (optional, but helps keep calendar in sync)
  const [rangeStartISO, setRangeStartISO] = useState<string | undefined>();
  const [rangeEndISO, setRangeEndISO] = useState<string | undefined>();

  // CREATE modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [draftCallType, setDraftCallType] = useState<(typeof CALL_TYPES)[number]>("Ask Us Anything");
  const [draftTitle, setDraftTitle] = useState(defaultTitleForCallType("Ask Us Anything"));
  const [titleTouched, setTitleTouched] = useState(false);

  const [draftDate, setDraftDate] = useState<Date | null>(null);
  const [draftHour, setDraftHour] = useState<number>(12);
  const [draftMinute, setDraftMinute] = useState<number>(0);
  const [draftAmPm, setDraftAmPm] = useState<"AM" | "PM">("PM");

  // EDIT modal state (clicking event)
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editEvent, setEditEvent] = useState<DbEvent | null>(null);
  const [editSlots, setEditSlots] = useState<DbSlot[]>([]);
  const [editBanner, setEditBanner] = useState<string>("");

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
          `✖ Failed to load events (HTTP ${res.status}). ${data?.error ?? (data?.raw ? data.raw.slice(0, 300) : "")}`
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
        setBanner(`✖ /api/keap/events returned non-JSON:\n${data.raw?.slice(0, 300)}`);
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
    // Open create modal with selected date
    setBanner("");
    setTitleTouched(false);

    const selected = info.start; // Date object (local)
    setDraftDate(selected);

    // defaults
    setDraftCallType("Ask Us Anything");
    setDraftTitle(defaultTitleForCallType("Ask Us Anything"));

    // pick a sane default time so it doesn't flip to day before in UTC.
    // Noon local works well as a default.
    setDraftHour(12);
    setDraftMinute(0);
    setDraftAmPm("PM");

    setCreateOpen(true);
  }

  // title autoupdate when call type changes (unless user manually edited title)
  function onChangeCallType(next: (typeof CALL_TYPES)[number]) {
    setDraftCallType(next);

    if (!titleTouched) {
      setDraftTitle(defaultTitleForCallType(next));
    }
  }

  async function createEvent() {
    setBanner("");

    if (!draftDate) return setBanner("✖ Start date is missing.");
    if (!draftCallType) return setBanner("✖ Call type is required.");

    const title = draftTitle.trim();
    if (!title) return setBanner("✖ Title is required.");

    try {
      const start_at = buildLocalISOFromDateParts(draftDate, draftHour, draftMinute, draftAmPm);

      const payload: any = {
        title,
        call_type: draftCallType,
        start_at,
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
          `✖ Create failed (HTTP ${res.status}). ${data?.error ?? (data?.raw ? data.raw.slice(0, 300) : "")}`
        );
        return;
      }

      if (data.__empty) return setBanner("✖ Create failed: API returned empty response body.");
      if (data.__parseError) return setBanner(`✖ Create failed: API returned non-JSON:\n${data.raw?.slice(0, 300)}`);

      setCreateOpen(false);

      // reload using current view range if available
      await loadRange(rangeStartISO, rangeEndISO);

      setBanner("✔ Event created");
    } catch (e: any) {
      setBanner(`✖ Create failed: ${e?.message ?? String(e)}`);
    }
  }

  async function openEdit(eventId: string) {
    setEditBanner("");
    setEditLoading(true);
    setEditOpen(true);
    setEditEvent(null);
    setEditSlots([]);

    try {
      const res = await fetch(`/api/keap/events/${eventId}`, { method: "GET" });
      const data = await safeJson(res);

      if (!res.ok) {
        setEditBanner(
          `✖ Failed to load event (HTTP ${res.status}). ${data?.error ?? (data?.raw ? data.raw.slice(0, 300) : "")}`
        );
        return;
      }

      if (data.__empty) return setEditBanner("✖ Event load failed: empty response body.");
      if (data.__parseError) return setEditBanner(`✖ Event load failed: non-JSON:\n${data.raw?.slice(0, 300)}`);

      setEditEvent(data.event as DbEvent);
      setEditSlots((data.slots ?? []) as DbSlot[]);
    } catch (e: any) {
      setEditBanner(`✖ Failed to load event: ${e?.message ?? String(e)}`);
    } finally {
      setEditLoading(false);
    }
  }

  async function deleteEventById(eventId: string, title: string) {
    const ok = confirm(`Delete "${title}"?`);
    if (!ok) return;

    setEditBanner("");
    setBanner("");

    try {
      const res = await fetch(`/api/keap/events/${eventId}`, { method: "DELETE" });
      const data = await safeJson(res);

      if (!res.ok) {
        const msg = `✖ Delete failed (HTTP ${res.status}). ${data?.error ?? (data?.raw ? data.raw.slice(0, 300) : "")}`;
        setEditBanner(msg);
        setBanner(msg);
        return;
      }

      setEditOpen(false);
      await loadRange(rangeStartISO, rangeEndISO);
      setBanner("✔ Deleted");
    } catch (e: any) {
      const msg = `✖ Delete failed: ${e?.message ?? String(e)}`;
      setEditBanner(msg);
      setBanner(msg);
    }
  }

  // Slot UI state helpers (per slot)
  type SlotUI = {
    mode: "minutesBefore" | "timeOfDay";
    minutesBefore: number; // positive minutes before
    dayChoice: "sameDay" | "dayBefore";
    hour: number;
    minute: number;
    ampm: "AM" | "PM";
  };

  function slotToUI(slot: DbSlot, eventStartISO: string): SlotUI {
    // default UI based on offset
    const minutes = Math.abs(slot.offset_minutes || 0);
    const defaultMinutesBefore = minutes || 15;

    // if offset is not set or is unusual, default to minutesBefore mode
    const eventStart = new Date(eventStartISO);
    const desired = new Date(eventStart.getTime() + (slot.offset_minutes || 0) * 60000);

    const dayChoice: "sameDay" | "dayBefore" =
      desired.toDateString() === eventStart.toDateString() ? "sameDay" : "dayBefore";

    const hour24 = desired.getHours();
    const ampm: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

    // if it aligns to a quarter hour and dayChoice is simple, timeOfDay mode is usable
    const minute = desired.getMinutes();
    const isQuarter = [0, 15, 30, 45].includes(minute);

    return {
      mode: isQuarter ? "timeOfDay" : "minutesBefore",
      minutesBefore: defaultMinutesBefore,
      dayChoice,
      hour: hour12,
      minute: isQuarter ? minute : 0,
      ampm,
    };
  }

  const [slotUI, setSlotUI] = useState<Record<number, SlotUI>>({});

  useEffect(() => {
    // whenever editEvent + slots load, seed UI state for slots
    if (!editEvent || !editSlots.length) return;

    const next: Record<number, SlotUI> = {};
    for (const s of editSlots) {
      next[s.slot_index] = slotToUI(s, editEvent.start_at);
    }
    setSlotUI(next);
  }, [editEvent?.id, editSlots.length]);

  function computeOffsetMinutesFromUI(ui: SlotUI, eventStartISO: string) {
    const eventStart = new Date(eventStartISO);

    if (ui.mode === "minutesBefore") {
      return -Math.abs(ui.minutesBefore || 0);
    }

    // timeOfDay
    const desired = new Date(eventStart);
    if (ui.dayChoice === "dayBefore") desired.setDate(desired.getDate() - 1);

    const h24 = to24Hour(ui.hour, ui.ampm);
    desired.setHours(h24, ui.minute, 0, 0);

    return minutesBetween(desired, eventStart); // usually negative
  }

  async function saveSlot(slotIndex: number) {
    if (!editEvent) return;
    const slot = editSlots.find((s) => s.slot_index === slotIndex);
    if (!slot) return;

    const ui = slotUI[slotIndex];
    const offset_minutes = ui ? computeOffsetMinutesFromUI(ui, editEvent.start_at) : slot.offset_minutes;

    setEditBanner("");

    try {
      const payload = {
        enabled: slot.enabled,
        offset_minutes,
        subject: slot.subject ?? "",
        html: slot.html ?? "",
        text_fallback: slot.text_fallback ?? "",
      };

      const res = await fetch(`/api/keap/events/${editEvent.id}/slots/${slotIndex}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        setEditBanner(
          `✖ Save slot ${slotIndex} failed (HTTP ${res.status}). ${data?.error ?? (data?.raw ? data.raw.slice(0, 300) : "")}`
        );
        return;
      }

      // Update local slot copy with saved result if returned
      const saved: DbSlot | undefined = data?.slot;
      if (saved) {
        setEditSlots((prev) => prev.map((s) => (s.slot_index === slotIndex ? { ...s, ...saved } : s)));
      } else {
        // still update offset locally
        setEditSlots((prev) => prev.map((s) => (s.slot_index === slotIndex ? { ...s, offset_minutes } : s)));
      }

      setEditBanner(`✔ Slot ${slotIndex} saved`);
    } catch (e: any) {
      setEditBanner(`✖ Save slot ${slotIndex} failed: ${e?.message ?? String(e)}`);
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
          Call Calendar
        </div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          {loading ? "Loading…" : `${events.length} events`}
        </div>
      </div>

      {banner && (
        <pre
          style={{
            margin: "0 0 10px 0",
            whiteSpace: "pre-wrap",
            color: banner.startsWith("✔") ? "#6ee7b7" : "#ff6b6b",
          }}
        >
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
        timeZone="local"
        selectable
        selectMirror
        select={onSelect}
        events={calendarEvents}
        // keep DB in sync with current view
        datesSet={(arg) => {
          const startISO = arg.start.toISOString();
          const endISO = arg.end.toISOString();
          setRangeStartISO(startISO);
          setRangeEndISO(endISO);
          loadRange(startISO, endISO);
        }}
        eventClick={(arg) => {
          // open edit modal instead of delete
          openEdit(arg.event.id);
        }}
      />

      {/* ---------- CREATE MODAL ---------- */}
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
          }}
          onClick={() => setCreateOpen(false)}
        >
          <div
            style={{
              width: 460,
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
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Call Type</div>
                <select
                  value={draftCallType}
                  onChange={(e) => onChangeCallType(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "#0b0b0b",
                    color: "white",
                  }}
                >
                  {CALL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Title</div>
                <input
                  value={draftTitle}
                  onChange={(e) => {
                    setTitleTouched(true);
                    setDraftTitle(e.target.value);
                  }}
                  placeholder={defaultTitleForCallType(draftCallType)}
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

              {/* Time picker */}
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Hour</div>
                  <select
                    value={draftHour}
                    onChange={(e) => setDraftHour(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "#0b0b0b",
                      color: "white",
                    }}
                  >
                    {Array.from({ length: 12 }).map((_, i) => {
                      const v = i + 1;
                      return (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Minutes</div>
                  <select
                    value={draftMinute}
                    onChange={(e) => setDraftMinute(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "#0b0b0b",
                      color: "white",
                    }}
                  >
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m}>
                        {String(m).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ width: 90 }}>
                  <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>AM/PM</div>
                  <select
                    value={draftAmPm}
                    onChange={(e) => setDraftAmPm(e.target.value as any)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "#0b0b0b",
                      color: "white",
                    }}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Date: {draftDate ? draftDate.toLocaleDateString() : "(missing)"} <br />
                Start preview:{" "}
                {draftDate ? formatLocalPreview(draftDate, draftHour, draftMinute, draftAmPm) : "(missing)"}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  onClick={() => setCreateOpen(false)}
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

      {/* ---------- EDIT MODAL ---------- */}
      {editOpen && (
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
          onClick={() => setEditOpen(false)}
        >
          <div
            style={{
              width: 760,
              maxWidth: "92vw",
              maxHeight: "90vh",
              overflow: "auto",
              background: "#0b0b0b",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 14,
              padding: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>
                {editEvent ? editEvent.title : "Event"}
              </div>
              <button
                onClick={() => setEditOpen(false)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "transparent",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            {editLoading && <div style={{ marginTop: 10, opacity: 0.75 }}>Loading…</div>}

            {editBanner && (
              <pre
                style={{
                  margin: "10px 0 0 0",
                  whiteSpace: "pre-wrap",
                  color: editBanner.startsWith("✔") ? "#6ee7b7" : "#ff6b6b",
                }}
              >
                {editBanner}
              </pre>
            )}

            {editEvent && (
              <div style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>
                <div><b>Call Type:</b> {editEvent.call_type}</div>
                <div>
                  <b>Start:</b>{" "}
                  {new Date(editEvent.start_at).toLocaleString()}
                </div>
              </div>
            )}

            {editEvent && (
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={() => deleteEventById(editEvent.id, editEvent.title)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "rgba(255,0,0,0.12)",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Delete Event
                </button>
              </div>
            )}

            {/* Slots */}
            {editEvent && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Reminder Slots</div>

                {editSlots.length === 0 && (
                  <div style={{ opacity: 0.7 }}>No slots found for this event.</div>
                )}

                {editSlots.map((slot) => {
                  const ui = slotUI[slot.slot_index];
                  const offsetPreview = ui
                    ? computeOffsetMinutesFromUI(ui, editEvent.start_at)
                    : slot.offset_minutes;

                  return (
                    <div
                      key={slot.slot_index}
                      style={{
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <div style={{ fontSize: 13, fontWeight: 800 }}>
                          Slot {slot.slot_index}
                          <span style={{ marginLeft: 10, fontWeight: 500, opacity: 0.75 }}>
                            (offset_minutes = {offsetPreview})
                          </span>
                        </div>

                        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, opacity: 0.9 }}>
                          <input
                            type="checkbox"
                            checked={slot.enabled}
                            onChange={(e) =>
                              setEditSlots((prev) =>
                                prev.map((s) =>
                                  s.slot_index === slot.slot_index ? { ...s, enabled: e.target.checked } : s
                                )
                              )
                            }
                          />
                          Enabled
                        </label>
                      </div>

                      {/* Timing mode */}
                      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ minWidth: 220 }}>
                          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Send Rule</div>
                          <select
                            value={ui?.mode ?? "minutesBefore"}
                            onChange={(e) => {
                              const mode = e.target.value as SlotUI["mode"];
                              setSlotUI((prev) => ({
                                ...prev,
                                [slot.slot_index]: {
                                  ...(prev[slot.slot_index] ?? {
                                    mode: "minutesBefore",
                                    minutesBefore: 15,
                                    dayChoice: "sameDay",
                                    hour: 9,
                                    minute: 0,
                                    ampm: "AM",
                                  }),
                                  mode,
                                },
                              }));
                            }}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              borderRadius: 10,
                              border: "1px solid rgba(255,255,255,0.18)",
                              background: "#0b0b0b",
                              color: "white",
                            }}
                          >
                            <option value="minutesBefore">Minutes before event</option>
                            <option value="timeOfDay">Time of day (same day/day before)</option>
                          </select>
                        </div>

                        {ui?.mode === "minutesBefore" && (
                          <div style={{ minWidth: 220 }}>
                            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Minutes Before</div>
                            <input
                              type="number"
                              value={ui?.minutesBefore ?? 15}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setSlotUI((prev) => ({
                                  ...prev,
                                  [slot.slot_index]: { ...(prev[slot.slot_index] as SlotUI), minutesBefore: v },
                                }));
                              }}
                              style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: 10,
                                border: "1px solid rgba(255,255,255,0.18)",
                                background: "transparent",
                                color: "white",
                              }}
                            />
                            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                              Examples: 1440 = 24h before, 360 = 6h before, 15 = 15m before
                            </div>
                          </div>
                        )}

                        {ui?.mode === "timeOfDay" && (
                          <>
                            <div style={{ minWidth: 160 }}>
                              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Day</div>
                              <select
                                value={ui?.dayChoice ?? "sameDay"}
                                onChange={(e) => {
                                  const dayChoice = e.target.value as SlotUI["dayChoice"];
                                  setSlotUI((prev) => ({
                                    ...prev,
                                    [slot.slot_index]: { ...(prev[slot.slot_index] as SlotUI), dayChoice },
                                  }));
                                }}
                                style={{
                                  width: "100%",
                                  padding: "10px 12px",
                                  borderRadius: 10,
                                  border: "1px solid rgba(255,255,255,0.18)",
                                  background: "#0b0b0b",
                                  color: "white",
                                }}
                              >
                                <option value="sameDay">Same day</option>
                                <option value="dayBefore">Day before</option>
                              </select>
                            </div>

                            <div style={{ minWidth: 110 }}>
                              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Hour</div>
                              <select
                                value={ui?.hour ?? 9}
                                onChange={(e) => {
                                  const hour = Number(e.target.value);
                                  setSlotUI((prev) => ({
                                    ...prev,
                                    [slot.slot_index]: { ...(prev[slot.slot_index] as SlotUI), hour },
                                  }));
                                }}
                                style={{
                                  width: "100%",
                                  padding: "10px 12px",
                                  borderRadius: 10,
                                  border: "1px solid rgba(255,255,255,0.18)",
                                  background: "#0b0b0b",
                                  color: "white",
                                }}
                              >
                                {Array.from({ length: 12 }).map((_, i) => {
                                  const v = i + 1;
                                  return (
                                    <option key={v} value={v}>
                                      {v}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>

                            <div style={{ minWidth: 120 }}>
                              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Minutes</div>
                              <select
                                value={ui?.minute ?? 0}
                                onChange={(e) => {
                                  const minute = Number(e.target.value);
                                  setSlotUI((prev) => ({
                                    ...prev,
                                    [slot.slot_index]: { ...(prev[slot.slot_index] as SlotUI), minute },
                                  }));
                                }}
                                style={{
                                  width: "100%",
                                  padding: "10px 12px",
                                  borderRadius: 10,
                                  border: "1px solid rgba(255,255,255,0.18)",
                                  background: "#0b0b0b",
                                  color: "white",
                                }}
                              >
                                {[0, 15, 30, 45].map((m) => (
                                  <option key={m} value={m}>
                                    {String(m).padStart(2, "0")}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div style={{ width: 90 }}>
                              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>AM/PM</div>
                              <select
                                value={ui?.ampm ?? "AM"}
                                onChange={(e) => {
                                  const ampm = e.target.value as SlotUI["ampm"];
                                  setSlotUI((prev) => ({
                                    ...prev,
                                    [slot.slot_index]: {
                                      ...(prev[slot.slot_index] as SlotUI),
                                      ampm,
                                    },
                                  }));
                                }}
                                style={{
                                  width: "100%",
                                  padding: "10px 12px",
                                  borderRadius: 10,
                                  border: "1px solid rgba(255,255,255,0.18)",
                                  background: "#0b0b0b",
                                  color: "white",
                                }}
                              >
                                <option value="AM">AM</option>
                                <option value="PM">PM</option>
                              </select>
                            </div>
                            </>
                          )}
                        </div>
  
                        {/* Copy fields */}
                        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                          <div>
                            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Subject</div>
                            <input
                              value={slot.subject ?? ""}
                              onChange={(e) =>
                                setEditSlots((prev) =>
                                  prev.map((s) =>
                                    s.slot_index === slot.slot_index ? { ...s, subject: e.target.value } : s
                                  )
                                )
                              }
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
                            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>HTML</div>
                            <textarea
                              value={slot.html ?? ""}
                              onChange={(e) =>
                                setEditSlots((prev) =>
                                  prev.map((s) => (s.slot_index === slot.slot_index ? { ...s, html: e.target.value } : s))
                                )
                              }
                              rows={6}
                              style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: 10,
                                border: "1px solid rgba(255,255,255,0.18)",
                                background: "transparent",
                                color: "white",
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                fontSize: 12,
                              }}
                            />
                          </div>
  
                          <div>
                            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Text fallback</div>
                            <textarea
                              value={slot.text_fallback ?? ""}
                              onChange={(e) =>
                                setEditSlots((prev) =>
                                  prev.map((s) =>
                                    s.slot_index === slot.slot_index ? { ...s, text_fallback: e.target.value } : s
                                  )
                                )
                              }
                              rows={3}
                              style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: 10,
                                border: "1px solid rgba(255,255,255,0.18)",
                                background: "transparent",
                                color: "white",
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                fontSize: 12,
                              }}
                            />
                          </div>
  
                          <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => saveSlot(slot.slot_index)}
                              style={{
                                padding: "10px 14px",
                                borderRadius: 10,
                                border: "1px solid rgba(255,255,255,0.2)",
                                background: "white",
                                color: "#111",
                                cursor: "pointer",
                                fontWeight: 800,
                              }}
                            >
                              Save Slot {slot.slot_index}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }