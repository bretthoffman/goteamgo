 "use client";
 
 import { useState } from "react";
 import KeapCalendar from "@/app/components/KeapCalendar";
 import SageLogo from "@/app/components/SageLogo";
 
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
              <SageLogo />
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