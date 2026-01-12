"use client";

import React, { useMemo, useState } from "react";
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
  const [events, setEvents] = useState<CalEvent[]>([
    // seed example
    { id: "1", title: "Example: Call", start: new Date().toISOString() },
  ]);

  const calendarEvents = useMemo(() => events, [events]);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, opacity: 0.9 }}>
        Calendar
      </div>

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
        select={(info) => {
          const title = prompt("Event title?");
          if (!title) return;

          const newEvt: CalEvent = {
            id: `evt_${Date.now()}`,
            title,
            start: info.startStr,
            end: info.endStr || undefined,
            allDay: info.allDay,
          };

          setEvents((prev) => [...prev, newEvt]);
        }}
        eventClick={(info) => {
          const ok = confirm(`Delete "${info.event.title}"?`);
          if (!ok) return;
          setEvents((prev) => prev.filter((e) => e.id !== info.event.id));
        }}
        eventDrop={(info) => {
          setEvents((prev) =>
            prev.map((e) =>
              e.id === info.event.id
                ? { ...e, start: info.event.start?.toISOString() || e.start, end: info.event.end?.toISOString() }
                : e
            )
          );
        }}
        eventResize={(info) => {
          setEvents((prev) =>
            prev.map((e) =>
              e.id === info.event.id
                ? { ...e, start: info.event.start?.toISOString() || e.start, end: info.event.end?.toISOString() || undefined }
                : e
            )
          );
        }}
      />
    </div>
  );
}