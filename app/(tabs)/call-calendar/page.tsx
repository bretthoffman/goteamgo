"use client";

import { useState } from "react";
import KeapCalendar from "@/app/components/KeapCalendar";

const CALENDAR_PASSWORD = "sage5180";

export default function CallCalendarPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");

  const handlePasswordSubmit = () => {
    if (password === CALENDAR_PASSWORD) {
      setIsAuthenticated(true);
      setPassword("");
    } else {
      alert("Incorrect password");
      setPassword("");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6" style={{ color: "#111" }}>
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 border border-gray-200">
          <div className="text-center mb-6">
            <div className="mx-auto mb-6 w-64">
              <svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300.000000 169.000000" preserveAspectRatio="xMidYMid meet">
                <g transform="translate(0.000000,169.000000) scale(0.100000,-0.100000)" fill="#22A9B8" stroke="none">
                  <path d="M1924 1156 c-30 -14 -68 -44 -95 -75 l-45 -51 -204 -50 c-232 -57 -260 -60 -260 -29 0 11 5 30 11 42 7 11 13 40 15 64 2 41 1 43 -31 49 -37 7 -116 -8 -173 -32 -42 -18 -495 -134 -523 -134 -17 0 -17 2 -2 37 27 65 2 150 -52 175 -29 13 -82 -2 -240 -72 -60 -26 -158 -63 -217 -82 -101 -31 -108 -35 -108 -59 l0 -27 73 23 c40 12 130 47 200 78 132 59 245 94 272 83 21 -8 19 -71 -5 -124 l-19 -43 -53 6 c-29 4 -79 13 -111 21 -33 8 -63 12 -68 8 -11 -6 -12 -74 -1 -90 27 -42 106 -44 187 -6 44 21 82 30 143 35 67 5 238 43 375 83 16 5 17 1 12 -29 -5 -27 -2 -39 17 -62 36 -42 98 -41 168 3 53 33 80 36 80 8 0 -36 94 -27 300 29 146 40 216 53 207 38 -12 -20 15 -72 48 -93 40 -25 58 -25 114 0 24 11 46 19 48 17 2 -2 -5 -25 -16 -51 -13 -29 -45 -69 -86 -107 -196 -184 -331 -463 -282 -582 29 -68 87 -59 147 25 58 79 150 283 204 448 l53 165 69 37 c70 37 279 112 345 123 31 6 40 2 70 -28 23 -23 50 -38 75 -43 49 -9 180 9 321 45 96 24 108 29 111 50 3 20 1 23 -15 16 -48 -19 -253 -66 -312 -71 -52 -4 -73 -2 -101 13 -53 27 -45 43 35 65 92 25 135 58 135 102 0 45 -26 66 -80 66 -82 0 -180 -71 -195 -141 -5 -22 -13 -28 -43 -33 -63 -12 -254 -77 -324 -111 -38 -18 -68 -30 -68 -26 0 23 27 80 51 108 28 32 45 85 34 103 -4 6 4 10 19 10 22 0 26 4 26 30 0 27 -6 34 -42 50 -59 27 -131 25 -194 -4z"/>
                </g>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to SAGE</h1>
            <p className="text-gray-600">Enter password to access calendar</p>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handlePasswordSubmit()}
            placeholder="enter password"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#3C6577]"
            autoFocus
          />
          <button
            onClick={handlePasswordSubmit}
            className="w-full bg-[#3C6577] text-white px-4 py-3 rounded-lg hover:bg-[#2D4D5C] transition-colors font-medium"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

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