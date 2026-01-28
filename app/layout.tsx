import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { usePathname } from "next/navigation";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "goteamgo",
  description: "Internal control panel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ margin: 0 }}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

/* ---------- App Shell ---------- */

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItem = (href: string, label: string) => {
    const active = pathname === href;

    return (
      <Link
        href={href}
        style={{
          padding: "8px 14px",
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 800,
          textDecoration: "none",
          color: active ? "white" : "rgba(255,255,255,0.75)",
          background: active ? "rgba(168,85,247,0.18)" : "transparent",
          border: active
            ? "1px solid rgba(168,85,247,0.55)"
            : "1px solid rgba(255,255,255,0.15)",
          transition: "all 120ms ease",
        }}
      >
        {label}
      </Link>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0b",
        color: "white",
      }}
    >
      {/* Top Nav */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "#0b0b0b",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ fontWeight: 900, letterSpacing: 0.3 }}>goteamgo</div>

        <nav style={{ display: "flex", gap: 10 }}>
          {navItem("/call-calendar", "Copy Calendar")}
          {navItem("/staffing", "Production Staffing")}
          {navItem("/studio", "Studio Checklist")}
        </nav>
      </header>

      {/* Page content */}
      <div>{children}</div>
    </div>
  );
}