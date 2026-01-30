"use client";

import React, { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg } from "@fullcalendar/core";
import { createPortal } from "react-dom";



// ---------- Types ---------

type DbEvent = {
  id: string;
  title: string;
  call_type: string;
  start_at: string;
  end_at: string | null;
  confirmed?: boolean | null;

  // Google Doc link (optional until created)
  doc_id?: string | null;
  doc_url?: string | null;

  // Post-event copy review
  event_kind?: string | null;
  parent_event_id?: string | null;
  post_event_enabled?: boolean | null;
  post_event_event_id?: string | null;
};

type DbSlot = {
  id?: string;
  event_id: string;
  slot_index: number;
  enabled: boolean;
  offset_minutes: number; // negative = before event
  subject: string;
  preview_line: string;
  html: string;
  text_fallback: string;
  doc_id?: string | null;
  doc_url?: string | null;
  reminder_key?: string | null;
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

type SendPreset = "dayBefore" | "morningOf" | "min15";

function presetToReminderKey(p: SendPreset): "day_before" | "morning_of" | "15_min_before" {
  if (p === "dayBefore") return "day_before";
  if (p === "morningOf") return "morning_of";
  return "15_min_before";
}

function reminderKeyToPreset(k?: string | null): SendPreset {
  if (k === "day_before") return "dayBefore";
  if (k === "morning_of") return "morningOf";
  if (k === "15_min_before") return "min15";
  return "morningOf"; // fallback
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
  const trimmed = callType.trim();

  // Special case: Copy Call → Copy Clinic
  if (trimmed === "Copy Call") {
    return "Copy Clinic";
  }

  // If it already ends with "call" (case-insensitive), use as-is
  if (trimmed.toLowerCase().endsWith(" call")) {
    return trimmed;
  }

  return `${trimmed} Call`;
}

function isEligibleForPostEvent(title: string): boolean {
  const t = (title || "").trim();
  if (/^30-30-30\s+call$/i.test(t)) return false;
  if (/obvio\s+q&a/i.test(t)) return false;
  return true;
}

function to24Hour(hour12: number, ampm: "AM" | "PM") {
  const h = hour12 % 12;
  return ampm === "PM" ? h + 12 : h;
}

/**
 * Build an ISO string from LOCAL date parts (year/month/day) and a chosen time (hour/min).
 * This is the key fix for "created day before / wrong time".
 */


const EASTERN_TZ = "America/New_York";

function formatEastern(iso: string) {
  // Displays like: 1/14/2026, 5:00 PM
  return new Date(iso).toLocaleString("en-US", {
    timeZone: EASTERN_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
// This function is for locking in eastern time 
function buildLocalISOFromDateParts(
  date: Date,
  hour12: number,
  minute: number,
  ampm: "AM" | "PM"
) {
  const h24 = to24Hour(hour12, ampm);

  // Build "wall time" parts we want in Eastern
  const y = date.getFullYear();
  const m = date.getMonth() + 1; // 1-12
  const d = date.getDate();

  // We'll search for the UTC instant that formats to those parts in America/New_York.
  // This avoids local-time drift and handles DST correctly.
  const target = {
    year: String(y),
    month: String(m).padStart(2, "0"),
    day: String(d).padStart(2, "0"),
    hour: String(h24).padStart(2, "0"),
    minute: String(minute).padStart(2, "0"),
  };

  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Try a small window of UTC candidates and pick the one that matches when viewed in Eastern.
  // (We try +/- 36 hours around "noon UTC" for safety.)
  const approxUtc = Date.UTC(y, m - 1, d, 12, 0, 0, 0);

  for (let offsetMin = -36 * 60; offsetMin <= 36 * 60; offsetMin += 15) {
    const candidate = new Date(approxUtc + offsetMin * 60_000);

    const parts = fmt.formatToParts(candidate).reduce((acc: any, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});

    if (
      parts.year === target.year &&
      parts.month === target.month &&
      parts.day === target.day &&
      parts.hour === target.hour &&
      parts.minute === target.minute
    ) {
      return candidate.toISOString(); // ✅ correct UTC ISO for the intended Eastern wall time
    }
  }

  // Fallback (should be rare)
  const fallback = new Date(y, m - 1, d, h24, minute, 0, 0);
  return fallback.toISOString();
}

function formatLocalPreview(date: Date, hour12: number, minute: number, ampm: "AM" | "PM") {
  const mm = String(minute).padStart(2, "0");
  return `${date.toLocaleDateString()} ${hour12}:${mm} ${ampm}`;
}
function exec(cmd: string, value?: string) {
  // ts-expect-error execCommand is deprecated but still supported
  document.execCommand(cmd, false, value);
}
function minutesBetween(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 60000);
}

// ---------- Component ----------
export default function KeapCalendar() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Confirmed state (loaded from events)
  const [confirmedById, setConfirmedById] = useState<Record<string, boolean>>({});
  function getEasternYMD(iso: string) {
    const d = new Date(iso);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
  
    const year = Number(parts.find((p) => p.type === "year")?.value);
    const month = Number(parts.find((p) => p.type === "month")?.value);
    const day = Number(parts.find((p) => p.type === "day")?.value);
  
    return { year, month, day };
  }
  
  function addDaysUTC(ymd: { year: number; month: number; day: number }, deltaDays: number) {
    const base = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day));
    base.setUTCDate(base.getUTCDate() + deltaDays);
    return { year: base.getUTCFullYear(), month: base.getUTCMonth() + 1, day: base.getUTCDate() };
  }
  
  function offsetMinutesForPreset(
    preset: "dayBefore" | "morningOf" | "min15",
    eventStartISO: string
  ) {
    const eventStart = new Date(eventStartISO);
  
    // 15 minutes before start is truly relative
    if (preset === "min15") return -15;
  
    // For "Day Before" and "Morning of" we’ll use a fixed Eastern time-of-day:
    // - Day Before 11:00 AM ET (matches what you were doing earlier)
    // - Morning of 9:00 AM ET
    const ymd0 = getEasternYMD(eventStartISO);
  
    const targetYMD = preset === "dayBefore" ? addDaysUTC(ymd0, -1) : ymd0;
  
    const hour24 = preset === "dayBefore" ? 11 : 9;
    const minute = 0;

    // Build a Date object first
    const targetDate = new Date(
      targetYMD.year,
      targetYMD.month - 1, // JS months are 0-based
      targetYMD.day,
      hour24,
      minute,
      0,
      0
    );

    // Now this is a REAL Date, so getTime() works
    return Math.round((targetDate.getTime() - eventStart.getTime()) / 60000);
  }
  
  function inferSendPreset(offsetMinutes: number, eventStartISO: string): "dayBefore" | "morningOf" | "min15" {
    const a = offsetMinutesForPreset("dayBefore", eventStartISO);
    const b = offsetMinutesForPreset("morningOf", eventStartISO);
    const c = -15;
  
    if (offsetMinutes === c) return "min15";
    if (offsetMinutes === b) return "morningOf";
    if (offsetMinutes === a) return "dayBefore";
  
    // fallback so the dropdown always has something selected
    // (you can change this to whatever default you want)
    return "dayBefore";
  }
  


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
  const hasDoc = !!(editEvent?.doc_id || editEvent?.doc_url);
  const [createDocBusy, setCreateDocBusy] = useState(false);
  const [editSlots, setEditSlots] = useState<DbSlot[]>([]);
  const [editBanner, setEditBanner] = useState<string>("");

  // HTML editor state
  const [htmlEditorOpen, setHtmlEditorOpen] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const editorRef = React.useRef<HTMLDivElement | null>(null);
  const [htmlDraft, setHtmlDraft] = useState<string>("");
  const [subjectDraft, setSubjectDraft] = useState<string>("");
  const [htmlEditorSlotIndex, setHtmlEditorSlotIndex] = useState<number | null>(null);
    // Hover state for preview overlay
  const [hoveredPreviewSlot, setHoveredPreviewSlot] = useState<number | null>(null);

  const calendarEvents = useMemo(() => events, [events]);
  async function createGoogleDocForEvent() {
    if (!editEvent) return;
    const ev = editEvent; // <-- this is the key (locks in non-null)
  
    if (ev.doc_id || ev.doc_url) return; // already created
    if (createDocBusy) return; // prevent double click
  
    setCreateDocBusy(true);
    setEditBanner("");
  
    try {
      const res = await fetch(`/api/keap/events/${ev.id}/create-doc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          call_type: ev.call_type,
          start_at: ev.start_at,
          title: ev.title,
        }),
      });
  
      const data = await safeJson(res);
  
      if (!res.ok) {
        setEditBanner(`✖ Create Doc failed (HTTP ${res.status}). ${data?.error ?? ""}`);
        return;
      }
  
      const doc_id = data?.doc_id ?? data?.event?.doc_id ?? null;
      const doc_url = data?.doc_url ?? data?.event?.doc_url ?? null;
  
      setEditEvent((prev) => (prev ? { ...prev, doc_id, doc_url } : prev));
    } catch (e: any) {
      setEditBanner(`✖ Create Doc failed. ${e?.message ?? String(e)}`);
    } finally {
      setCreateDocBusy(false);
    }
  }

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
      
      // Load confirmed state from events
      const confirmedMap: Record<string, boolean> = {};
      rows.forEach((r) => {
        if (r.confirmed !== undefined && r.confirmed !== null) {
          confirmedMap[r.id] = r.confirmed;
        }
      });
      setConfirmedById(confirmedMap);
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
      let res = await fetch(`/api/keap/events/${eventId}`, { method: "GET" });
      let data = await safeJson(res);

      if (!res.ok) {
        setEditBanner(
          `✖ Failed to load event (HTTP ${res.status}). ${data?.error ?? (data?.raw ? data.raw.slice(0, 300) : "")}`
        );
        return;
      }

      if (data.__empty) return setEditBanner("✖ Event load failed: empty response body.");
      if (data.__parseError) return setEditBanner(`✖ Event load failed: non-JSON:\n${data.raw?.slice(0, 300)}`);

      let event = data.event as DbEvent;
      const kind = event.event_kind ?? "call";

      // For call events eligible for post-event, ensure post-event row exists (idempotent)
      if (kind === "call" && isEligibleForPostEvent(event.title)) {
        const ensureRes = await fetch(`/api/keap/events/${eventId}/ensure-post-event`, { method: "POST" });
        const ensureData = await safeJson(ensureRes);
        if (ensureRes.ok && ensureData?.ok) {
          res = await fetch(`/api/keap/events/${eventId}`, { method: "GET" });
          data = await safeJson(res);
          if (res.ok && data?.event) event = data.event as DbEvent;
        }
      }

      setEditEvent(event);
      setEditSlots((data.slots ?? []) as DbSlot[]);

      if (event.confirmed !== undefined && event.confirmed !== null) {
        setConfirmedById((prev) => ({ ...prev, [event.id]: event.confirmed! }));
      }
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
    dayChoice: "sameDay" | "dayBefore" | "twoDaysBefore";
    hour: number;
    minute: number;
    ampm: "AM" | "PM";
  };
  
  function slotToUI(slot: DbSlot, eventStartISO: string): SlotUI {
    // default UI based on offset
    const minutes = Math.abs(slot.offset_minutes || 0);
    const defaultMinutesBefore = minutes || 15;
  
    const eventStart = new Date(eventStartISO);
    const desired = new Date(eventStart.getTime() + (slot.offset_minutes || 0) * 60000);
  
    // ✅ 3-way dayChoice based on whole-day difference
    const startDay = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
    const desiredDay = new Date(desired.getFullYear(), desired.getMonth(), desired.getDate());
    const diffDays = Math.round((startDay.getTime() - desiredDay.getTime()) / 86400000);
  
    let dayChoice: SlotUI["dayChoice"] = "sameDay";
    if (diffDays === 1) dayChoice = "dayBefore";
    if (diffDays >= 2) dayChoice = "twoDaysBefore";
  
    const hour24 = desired.getHours();
    const ampm: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  
    // if it aligns to a quarter hour, timeOfDay mode is usable
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
  async function saveSlotFromEditor(slotIndex: number, html: string) {
    if (!editEvent) return;
  
    const slot = editSlots.find((s) => s.slot_index === slotIndex);
    if (!slot) return;
  
    // ...now slot is valid everywhere below
    const ui = slotUI[slotIndex];
    const offset_minutes = ui
      ? computeOffsetMinutesFromUI(ui, editEvent.start_at)
      : slot.offset_minutes;

    setEditBanner("");

    try {
      const payload = {
        enabled: slot.enabled,
        offset_minutes,
        subject: slot.subject ?? "",
        preview_line: slot.preview_line ?? "",
        html,
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
          `✖ Save failed (HTTP ${res.status}). ${data?.error ?? (data?.raw ? data.raw.slice(0, 300) : "")}`
        );
        return;
      }

      const saved: DbSlot | undefined = data?.slot;
      if (saved) {
        setEditSlots((prev) =>
          prev.map((s) => (s.slot_index === slotIndex ? { ...s, ...saved } : s))
        );
      }

      setEditBanner(`✔ Slot ${slotIndex} saved`);
      setHtmlEditorOpen(false);
      setEditingSlotIndex(null);
    } catch (e: any) {
      setEditBanner(`✖ Save failed: ${e?.message ?? String(e)}`);
    }
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
    if (ui.dayChoice === "twoDaysBefore") desired.setDate(desired.getDate() - 2);

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
        preview_line: slot.preview_line ?? "",
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

        // Use viewport height so the month always shows all rows (no clipping/scrolling)
        height="calc(100vh - 260px)"
        contentHeight="auto"
        expandRows={true}

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
        eventContent={(arg) => {
          const id = String(arg.event.id);
          const confirmed = !!confirmedById[id];

          return (
            <div
              style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                lineHeight: "18px",
                background: confirmed ? "rgba(34,197,94,0.35)" : "rgba(250,204,21,0.35)",
                border: confirmed ? "1px solid rgba(34,197,94,0.55)" : "1px solid rgba(250,204,21,0.55)",
                color: "#111",
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={arg.event.title}
            >
              {arg.event.title}
            </div>
          );
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
                        {editEvent && (
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
                <div>Call Type: {editEvent.call_type}</div>
                <div>
                  Start: {formatEastern(editEvent.start_at)} Eastern
                </div>
              </div>
            )}

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
      {mounted && editOpen &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 999999,
              padding: 16,
            }}
            onClick={() => setEditOpen(false)}
          >
            <div
              style={{
                width: "min(1400px, 96vw)",
                maxWidth: "96vw",
                height: "85vh",
                overflowY: "auto",
                background: "#0b0b0b",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 14,
                padding: 16,
                display: "flex",
                flexDirection: "column",
              }}
              onClick={(e) => e.stopPropagation()}
            >
                  <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 800, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {editEvent ? editEvent.title : "Event"}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 14, flex: "0 0 auto" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, opacity: 0.9 }}>
                      <div style={{ fontWeight: 800 }}>Confirmed?</div>

                      <label style={{ position: "relative", width: 50, height: 28, display: "inline-block" }}>
                        <input
                          type="checkbox"
                          checked={editEvent ? !!confirmedById[editEvent.id] : false}
                          onChange={async () => {
                            if (!editEvent) return;
                            const eventId = editEvent.id;
                            const prevValue = !!confirmedById[eventId];
                            const nextValue = !prevValue;
                            
                            // Optimistic UI update
                            setConfirmedById((prev) => ({
                              ...prev,
                              [eventId]: nextValue,
                            }));
                            
                            // Persist to Supabase
                            try {
                              const res = await fetch(`/api/keap/events/${eventId}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ confirmed: nextValue }),
                              });
                              
                              if (!res.ok) {
                                const data = await res.json().catch(() => null);
                                setEditBanner(`✖ Failed to update confirmed: ${data?.error ?? "Unknown error"}`);
                                // Revert on error
                                setConfirmedById((prev) => ({
                                  ...prev,
                                  [eventId]: prevValue,
                                }));
                              }
                            } catch (err: any) {
                              setEditBanner(`✖ Failed to update confirmed: ${err?.message ?? String(err)}`);
                              // Revert on error
                              setConfirmedById((prev) => ({
                                ...prev,
                                [eventId]: prevValue,
                              }));
                            }
                          }}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />

                        <span
                          style={{
                            position: "absolute",
                            inset: 0,
                            borderRadius: 999,
                            background: editEvent && confirmedById[editEvent.id] ? "#22c55e" : "#d1d5db",
                            transition: "background 150ms ease",
                            border: "1px solid rgba(0,0,0,0.15)",
                          }}
                        />

                        <span
                          style={{
                            position: "absolute",
                            top: 3,
                            left: editEvent && confirmedById[editEvent.id] ? 25 : 3,
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: "white",
                            transition: "left 150ms ease",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                          }}
                        />
                      </label>
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

            {/* Slots: Description Copy (single slot) or Reminder Slots (3 slots) */}
            {editEvent && (
              <div style={{ marginTop: 16 }}>
                {(editEvent.event_kind ?? "call") === "description_copy" ? (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Description Copy</div>
                    {editSlots.length === 0 ? (
                      <div style={{ opacity: 0.7 }}>No slot found.</div>
                    ) : (
                      (() => {
                        const slot = editSlots.find((s) => s.slot_index === 1);
                        if (!slot) return <div style={{ opacity: 0.7 }}>Slot 1 not found.</div>;
                        const hasDoc = !!(slot.doc_id && slot.doc_url);
                        return (
                          <div
                            style={{
                              border: "1px solid rgba(255,255,255,0.12)",
                              borderRadius: 12,
                              padding: 12,
                              maxWidth: 420,
                              display: "flex",
                              flexDirection: "column",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                              <div style={{ fontSize: 13, fontWeight: 800 }}>Description Copy</div>
                              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, opacity: hasDoc ? 0.6 : 0.9 }}>
                                <input
                                  type="checkbox"
                                  checked={!!slot.enabled}
                                  disabled={hasDoc}
                                  onChange={async (e) => {
                                    if (!editEvent || hasDoc) return;
                                    const enabled = e.target.checked;
                                    setEditSlots((prev) =>
                                      prev.map((s) => (s.slot_index === 1 ? { ...s, enabled } : s))
                                    );
                                    await fetch(`/api/keap/events/${editEvent.id}/slots/1`, {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ enabled, offset_minutes: slot.offset_minutes }),
                                    });
                                  }}
                                  style={{ opacity: hasDoc ? 0.5 : 1, cursor: hasDoc ? "not-allowed" : "pointer" }}
                                />
                                Enabled
                              </label>
                            </div>
                            {slot.enabled && (
                              <>
                                <div style={{ marginTop: 12 }}>
                                  <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Google Doc</div>
                                  {hasDoc ? (
                                    <div
                                      onClick={() => window.open(slot.doc_url!, "_blank", "noopener,noreferrer")}
                                      style={{
                                        padding: 12,
                                        borderRadius: 12,
                                        background: "white",
                                        border: "1px solid #d1d5db",
                                        cursor: "pointer",
                                        color: "#111",
                                        fontSize: 13,
                                      }}
                                    >
                                      Open Doc →
                                    </div>
                                  ) : (
                                    <div style={{ border: "1px dashed rgba(255,255,255,0.25)", borderRadius: 12, padding: 12, opacity: 0.8, fontSize: 13 }}>
                                      No doc linked. Click &quot;Create Doc&quot; below.
                                    </div>
                                  )}
                                </div>
                                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                                  <button
                                    disabled={hasDoc}
                                    onClick={async () => {
                                      if (!editEvent) return;
                                      setEditBanner("");
                                      try {
                                        const res = await fetch(`/api/keap/events/${editEvent.id}/create-description-doc`, { method: "POST" });
                                        const data = await res.json().catch(() => null);
                                        if (!res.ok || !data?.ok) {
                                          setEditBanner(`✖ Create Doc failed: ${data?.error ?? "Unknown error"}`);
                                          return;
                                        }
                                        await openEdit(editEvent.id);
                                      } catch (err: any) {
                                        setEditBanner(`✖ Create Doc failed: ${err?.message ?? String(err)}`);
                                      }
                                    }}
                                    style={{
                                      padding: "10px 14px",
                                      borderRadius: 10,
                                      border: "1px solid rgba(255,255,255,0.2)",
                                      background: hasDoc ? "transparent" : "white",
                                      color: hasDoc ? "rgba(255,255,255,0.6)" : "#111",
                                      cursor: hasDoc ? "default" : "pointer",
                                      fontWeight: 800,
                                    }}
                                  >
                                    {hasDoc ? "Doc Created" : "Create Doc"}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </>
                ) : (
                  <>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Reminder Slots</div>

                {editSlots.length === 0 && (
                  <div style={{ opacity: 0.7 }}>No slots found for this event.</div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 12,
                    alignItems: "start",
                  }}
                >
                  {editSlots.map((slot) => {
                  const selected: SendPreset = slot.reminder_key
                  ? reminderKeyToPreset(slot.reminder_key)
                  : (() => {
                      if (slot.offset_minutes === -1440) return "dayBefore";
                      if (slot.offset_minutes === -15) return "min15";
                      return "morningOf";
                    })();

                  const hasDoc = !!(slot.doc_id && slot.doc_url);

                  return (
                    <div
                      key={slot.slot_index}
                      style={{
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        padding: 12,
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        transition: "all 180ms ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <div style={{ fontSize: 13, fontWeight: 800 }}>Slot {slot.slot_index}</div>

                        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, opacity: hasDoc ? 0.6 : 0.9 }}>
                        <input
                            type="checkbox"
                            checked={!!slot.enabled}
                            disabled={hasDoc} // ✅ lock once doc exists
                            onChange={async (e) => {
                              if (!editEvent) return;
                              if (hasDoc) return;

                              const enabled = e.target.checked;

                              // optimistic UI
                              setEditSlots((prev) =>
                                prev.map((s) => (s.slot_index === slot.slot_index ? { ...s, enabled } : s))
                              );

                              // ✅ persist immediately
                              await fetch(`/api/keap/events/${editEvent.id}/slots/${slot.slot_index}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  enabled,
                                  offset_minutes: slot.offset_minutes,
                                  reminder_key: slot.reminder_key ?? null,
                                }),
                              });
                            }}
                            style={{
                              opacity: hasDoc ? 0.5 : 1,
                              cursor: hasDoc ? "not-allowed" : "pointer",
                            }}
                          />
                          Enabled
                        </label>
                      </div>

                      {/* Collapsible body (only show when enabled) */}
                      {slot.enabled && (
                        <>
                          {/* Timing dropdown (locks after doc is created) */}
                          <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Send</div>
                            <select
                              value={selected}
                              disabled={hasDoc}
                              onChange={async (e) => {
                                if (!editEvent) return;
                              
                                const v = e.target.value as SendPreset;
                                const offset_minutes = v === "dayBefore" ? -1440 : v === "min15" ? -15 : 0;
                                const reminder_key = presetToReminderKey(v); // ✅ day_before / morning_of / 15_min_before
                              
                                // optimistic UI
                                setEditSlots((prev) =>
                                  prev.map((s) =>
                                    s.slot_index === slot.slot_index ? { ...s, offset_minutes, reminder_key } : s
                                  )
                                );
                              
                                // ✅ persist immediately
                                await fetch(`/api/keap/events/${editEvent.id}/slots/${slot.slot_index}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ offset_minutes, reminder_key }),
                                });
                              }}
                              style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: 10,
                                border: "1px solid rgba(255,255,255,0.18)",
                                background: "#0b0b0b",
                                color: "white",
                                whiteSpace: "nowrap",
                                opacity: hasDoc ? 0.7 : 1,
                                cursor: hasDoc ? "not-allowed" : "pointer",
                              }}
                            >
                              <option value="dayBefore">Day Before</option>
                              <option value="morningOf">Morning of</option>
                              <option value="min15">15 minutes before</option>
                            </select>
                          </div>

                          {/* Google Doc preview */}
                          <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Email Copy</div>

                            {hasDoc ? (
                              <div
                                onMouseEnter={() => setHoveredPreviewSlot(slot.slot_index)}
                                onMouseLeave={() => setHoveredPreviewSlot(null)}
                                onClick={() => window.open(slot.doc_url!, "_blank", "noopener,noreferrer")}
                                style={{
                                  position: "relative",
                                  height: 180,
                                  borderRadius: 12,
                                  overflow: "hidden",
                                  cursor: "pointer",
                                  background: "white",
                                  border: "1px solid #d1d5db",
                                  padding: 12,
                                  display: "flex",
                                  flexDirection: "column",
                                  justifyContent: "space-between",
                                }}
                                title="Open Google Doc"
                              >
                                <div>
                                <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>
                                  Google Doc linked
                                </div>

                                  <div style={{ fontSize: 14, fontWeight: 800, color: "#111827", marginBottom: 8 }}>
                                    Open Doc →
                                  </div>

                                  <div style={{ fontSize: 12, color: "#1f2937", wordBreak: "break-all" }}>
                                    {slot.doc_url}
                                  </div>
                                </div>

                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "#4b5563",
                                    marginTop: 10,
                                  }}
                                >
                                  Click to open (you can’t preview Google Docs inside the app)
                                </div>

                                {/* Hover overlay like your old "Edit" */}
                                <div
                                  style={{
                                    position: "absolute",
                                    inset: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: "rgba(0,0,0,0.08)",
                                    opacity: hoveredPreviewSlot === slot.slot_index ? 1 : 0,
                                    transition: "opacity 120ms ease",
                                    pointerEvents: "none",
                                  }}
                                >
                                  <div
                                    style={{
                                      padding: "8px 14px",
                                      borderRadius: 999,
                                      background: "rgba(255,255,255,0.92)",
                                      color: "#111",
                                      fontWeight: 800,
                                      border: "1px solid rgba(0,0,0,0.2)",
                                    }}
                                  >
                                    Open
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div
                                style={{
                                  border: "1px dashed rgba(255,255,255,0.25)",
                                  borderRadius: 12,
                                  padding: 12,
                                  opacity: 0.8,
                                  fontSize: 13,
                                }}
                              >
                                No doc linked yet. Click “Create Doc” below.
                              </div>
                            )}
                          </div>

                          {/* Per-slot Create Doc button (replaces Save) */}
                          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                            <button
                              disabled={hasDoc}
                              onClick={async () => {
                                if (!editEvent) return;

                                try {
                                  setEditBanner("");

                                  const res = await fetch(`/api/keap/events/${editEvent.id}/create-doc`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      slot_index: slot.slot_index,
                                      reminder_key: slot.reminder_key ?? presetToReminderKey(selected),
                                      call_type: editEvent.call_type,
                                      start_at: editEvent.start_at,
                                    }),
                                  });

                                  const data = await res.json().catch(() => null);

                                  if (!res.ok || !data?.ok) {
                                    const msg = data?.error ?? "Unknown error";
                                    const details = data?.details ? `\n\n${JSON.stringify(data.details, null, 2)}` : "";
                                    setEditBanner(`✖ Create Doc failed: ${msg}${details}`);
                                    return;
                                  }

                                  // Refresh the modal data so slot.doc_id/doc_url appears and locks UI
                                  await openEdit(editEvent.id);
                                } catch (err: any) {
                                  setEditBanner(`✖ Create Doc failed: ${err?.message ?? String(err)}`);
                                }
                              }}
                              style={{
                                padding: "10px 14px",
                                borderRadius: 10,
                                border: "1px solid rgba(255,255,255,0.2)",
                                background: hasDoc ? "transparent" : "white",
                                color: hasDoc ? "rgba(255,255,255,0.6)" : "#111",
                                cursor: hasDoc ? "default" : "pointer",
                                fontWeight: 800,
                              }}
                            >
                              {hasDoc ? "Doc Created" : "Create Doc"}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
                </div>

                {/* Post-Event? toggle: for eligible call events */}
                {(editEvent.event_kind ?? "call") === "call" &&
                  isEligibleForPostEvent(editEvent.title) && (
                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.9 }}>Post-Event?</div>
                    <label style={{ position: "relative", width: 50, height: 28, display: "inline-block" }}>
                      <input
                        type="checkbox"
                        checked={!!editEvent.post_event_enabled}
                        onChange={async () => {
                          if (!editEvent) return;
                          const next = !editEvent.post_event_enabled;
                          setEditEvent((prev) => (prev ? { ...prev, post_event_enabled: next } : prev));
                          try {
                            const res = await fetch(`/api/keap/events/${editEvent.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ post_event_enabled: next }),
                            });
                            if (!res.ok) {
                              const data = await res.json().catch(() => null);
                              setEditBanner(`✖ Failed to update: ${data?.error ?? "Unknown error"}`);
                              setEditEvent((prev) => (prev ? { ...prev, post_event_enabled: !next } : prev));
                              return;
                            }
                            await loadRange(rangeStartISO, rangeEndISO);
                          } catch (err: any) {
                            setEditBanner(`✖ Failed: ${err?.message ?? String(err)}`);
                            setEditEvent((prev) => (prev ? { ...prev, post_event_enabled: !next } : prev));
                          }
                        }}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: 999,
                          background: editEvent.post_event_enabled ? "#22c55e" : "#d1d5db",
                          transition: "background 150ms ease",
                          border: "1px solid rgba(0,0,0,0.15)",
                        }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          top: 3,
                          left: editEvent.post_event_enabled ? 25 : 3,
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: "white",
                          transition: "left 150ms ease",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                        }}
                      />
                    </label>
                  </div>
                )}
                  </>
                )}
              </div>
            )}
            </div>
          </div>
        , document.body)
      }

    </div>
  );
}