"use client";

import KeapCalendar from "@/app/components/KeapCalendar";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        padding: "24px",
        boxSizing: "border-box",
        fontFamily: "system-ui",
        background: "#0b0b0b",
        color: "white",
      }}
    >
      <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 10, letterSpacing: 0.2 }}>
        Call Calendar - Copy
      </h1>

      <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 10 }}>
        Manage call reminders and their related copy in Google Docs.
      </div>

      <div
        style={{
          width: "100%",
          marginTop: 16,
          background: "#121212",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <div
          style={{
            background: "#181818",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 16,
            padding: 12,
          }}
        >
          <KeapCalendar />
        </div>
      </div>
    </main>
  );
}