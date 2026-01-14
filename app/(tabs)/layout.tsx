"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Call Calendar", href: "/keap" },
  { label: "Production Staffing Portal", href: "/studio-booking" },
  { label: "Studio Rental Checklist", href: "/team-tasks" },
];

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ padding: 24 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#8b5cf6" }}>
          goteamgo
        </div>

        <nav style={{ display: "flex", gap: 10 }}>
          {tabs.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                style={{
                  textDecoration: "none",
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #8b5cf6",
                  color: "#8b5cf6",
                  background: active ? "rgba(139, 92, 246, 0.12)" : "transparent",
                  fontWeight: active ? 800 : 600,
                }}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {children}
    </div>
  );
}