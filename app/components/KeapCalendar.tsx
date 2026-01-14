"use client";

import React, { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg } from "@fullcalendar/core";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";


function TipTapEmailEditor({
  initialHtml,
  onSave,
  onCancel,
  title,
}: {
  initialHtml: string;
  onSave: (html: string) => void;
  onCancel: () => void;
  title: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: initialHtml?.trim() ? initialHtml : "<p></p>",
    editorProps: {
      attributes: {
        style:
          "min-height:70vh; outline:none; font-size:16px; line-height:1.55;",
      },
    },
  });

  if (!editor) return null;

  const setLink = () => {
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("Link URL (https://...)", prev || "");
    if (url === null) return; // cancelled
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "white",
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          background: "white",
          borderBottom: "1px solid rgba(0,0,0,0.12)",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 900, color: "#111" }}>
          {title}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.18)",
              background: "transparent",
              color: "#111",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Cancel
          </button>

          <button
            onClick={() => onSave(editor.getHTML())}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.18)",
              background: "#111",
              color: "white",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            Save
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          style={ttBtn(editor.isActive("bold"))}
        >
          Bold
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          style={ttBtn(editor.isActive("italic"))}
        >
          Italic
        </button>

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          style={ttBtn(editor.isActive("bulletList"))}
        >
          Bullets
        </button>

        <button onClick={setLink} style={ttBtn(editor.isActive("link"))}>
          Link
        </button>

        <button
          onClick={() => editor.chain().focus().insertContent("🔥").run()}
          style={ttBtn(false)}
        >
          Emoji
        </button>
      </div>

      {/* White page */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 14,
            padding: 20,
            background: "white",
            color: "#111",
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

function ttBtn(active: boolean): React.CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.15)",
    background: active ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.03)",
    color: "#111",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
  };
}
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
  const trimmed = callType.trim();

  // If it already ends with "call" (case-insensitive), use as-is
  if (trimmed.toLowerCase().endsWith(" call")) {
    return trimmed;
  }

  return `${trimmed} Call`;
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
  function openHtmlEditor(slotIndex: number) {
    setEditingSlotIndex(slotIndex);
    setHtmlEditorOpen(true);
  
    // Load current HTML into the editor AFTER modal mounts
    setTimeout(() => {
      const slot = editSlots.find((s) => s.slot_index === slotIndex);
      if (editorRef.current) {
        editorRef.current.innerHTML = slot?.html?.trim()
          ? slot!.html
          : "<p><br/></p>"; // empty starter
      }
    }, 0);
  }
  function wrapEmailHtml(bodyHtml: string) {
    // Gives the iframe a clean baseline so preview looks consistent
    return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body style="margin:0; padding:16px; font-family: Arial, Helvetica, sans-serif; font-size:16px; line-height:24px; color:#111;">
      ${bodyHtml || ""}
    </body>
  </html>`;
  }
  
  function safeDefaultBody() {
    // Helps when user opens editor for an empty slot
    return `<p style="margin:0 0 16px 0;">Hey <span style="background:#fff59d; padding:0 4px; border-radius:3px;">~Contact.FirstName~</span>,</p>
  <p style="margin:0;">(Write your email here)</p>`;
  }
  function saveHtmlFromEditor() {
    if (editingSlotIndex == null) return;
    const html = editorRef.current?.innerHTML ?? "";
  
    setEditSlots((prev) =>
      prev.map((s) =>
        s.slot_index === editingSlotIndex ? { ...s, html } : s
      )
    );
  
    setHtmlEditorOpen(false);
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

                      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
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
                                <option value="twoDaysBefore">2 Days before</option>
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
                            {/* Email preview (click to edit) */}
                            <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Email preview</div>

                          <div
                            onMouseEnter={() => setHoveredPreviewSlot(slot.slot_index)}
                            onMouseLeave={() => setHoveredPreviewSlot(null)}
                            onClick={() => {
                              setEditingSlotIndex(slot.slot_index);
                              setHtmlEditorOpen(true);
                              // Load current HTML into editor AFTER modal mounts
                              setTimeout(() => {
                                const fresh = editSlots.find((s) => s.slot_index === slot.slot_index);
                                if (editorRef.current) {
                                  editorRef.current.innerHTML = fresh?.html?.trim()
                                    ? fresh!.html
                                    : safeDefaultBody();
                                }
                              }, 0);
                            }}
                            style={{
                              position: "relative",
                              border: "1px solid rgba(255,255,255,0.18)",
                              borderRadius: 12,
                              background: "#0b0b0b",
                              padding: 12,
                              minHeight: 120,
                              cursor: "pointer",
                              overflow: "hidden",
                            }}
                          >
                            {/* Rendered preview */}
                            <div style={{ position: "relative" }}>
                              {slot.html?.trim() ? (
                                <iframe
                                  title={`preview-slot-${slot.slot_index}`}
                                  style={{
                                    width: "100%",
                                    height: 180,
                                    border: "0",
                                    borderRadius: 10,
                                    background: "white",
                                  }}
                                  sandbox=""
                                  srcDoc={wrapEmailHtml(slot.html)}
                                />
                              ) : (
                                <div style={{ opacity: 0.9, fontSize: 13, lineHeight: 1.4 }}>
                                  Click to write this email…
                                </div>
                              )}
                            </div>

                            {/* Hover overlay */}
                            <div
                              style={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "rgba(0,0,0,0.35)",
                                opacity: hoveredPreviewSlot === slot.slot_index ? 1 : 0,
                                transition: "opacity 120ms ease",
                                pointerEvents: "auto",
                                cursor: "pointer",
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
                                Edit
                              </div>
                            </div>
                          </div>
                        </div>

                            {/* Raw HTML (read-only) */}
                            <div style={{ marginTop: 12 }}>
                              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>HTML</div>
                              <textarea
                                value={slot.html ?? ""}
                                readOnly
                                style={{
                                  width: "100%",
                                  minHeight: 110,
                                  padding: "10px 12px",
                                  borderRadius: 10,
                                  border: "1px solid rgba(255,255,255,0.18)",
                                  background: "#0b0b0b",
                                  color: "white",
                                  fontFamily: "monospace",
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
                      {htmlEditorOpen && editingSlotIndex === slot.slot_index && (
                        <TipTapEmailEditor
                          title={`Edit Email — Slot ${slot.slot_index}`}
                          initialHtml={editSlots.find((s) => s.slot_index === slot.slot_index)?.html ?? ""}
                          onCancel={() => {
                            setHtmlEditorOpen(false);
                            setEditingSlotIndex(null);
                          }}
                          onSave={(html) => saveSlotFromEditor(slot.slot_index, html)}
                        />
                      )}
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