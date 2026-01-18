"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Call Calendar", href: "/call-calendar" },
  { label: "Production Staffing Portal", href: "/production-staffing-portal" },
  { label: "Studio Rental Checklist", href: "/studio-rental-checklist" },
];

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0b",
        color: "white",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* APP HEADER / TABS */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          gap: 18,
          background: "#0b0b0b",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 900,
            letterSpacing: 0.2,
            color: "#8b5cf6",
          }}
        >
          goteamgo
        </div>

        <nav style={{ display: "flex", gap: 10 }}>
          {tabs.map((t) => {
            const active = pathname.startsWith(t.href);

            return (
              <Link
                key={t.href}
                href={t.href}
                style={{
                  textDecoration: "none",
                  padding: "8px 12px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 800,
                  color: active ? "white" : "rgba(255,255,255,0.65)",
                  background: active ? "rgba(139,92,246,0.18)" : "transparent",
                  border: active
                    ? "1px solid rgba(139,92,246,0.45)"
                    : "1px solid rgba(255,255,255,0.12)",
                  transition: "all 120ms ease",
                }}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* PAGE CONTENT */}
      <div style={{ flex: 1, padding: 24 }}>
        {children}
      </div>
    </div>
  );
}