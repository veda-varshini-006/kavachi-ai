"use client";

import "@/app/globals.css";
import Sidebar from "@/components/layout/sidebar";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ShieldCheck, RefreshCw, Database } from "lucide-react";
import { inter, playfair } from "./fonts";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [dbStatus, setDbStatus] = useState<string>("checking");
  const [resetting, setResetting] = useState<boolean>(false);
  const [resetMsg, setResetMsg] = useState<string>("");
  const pathname = usePathname();
  const isLandingPage = pathname === "/";

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/v1/system/status");
      const data = await res.json();
      setDbStatus(data.components?.database || "offline");
    } catch {
      setDbStatus("offline");
    }
  };

  const handleReset = async () => {
    if (confirm("Are you sure you want to reset and reseed the synthetic database?")) {
      setResetting(true);
      setResetMsg("Resetting...");
      try {
        const res = await fetch("/api/v1/dev/reset", { method: "POST" });
        if (res.ok) {
          setResetMsg("Success!");
          checkStatus();
          setTimeout(() => setResetMsg(""), 3000);
          window.location.reload();
        } else {
          setResetMsg("Error resetting");
        }
      } catch {
        setResetMsg("Error resetting");
      } finally {
        setResetting(false);
      }
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="flex h-screen w-screen overflow-hidden bg-background text-gray-100 font-sans">
        {/* Subtle grainy noise overlay across entire app */}
        <div className="pointer-events-none fixed inset-0 z-[100] opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: "url('https://upload.wikimedia.org/wikipedia/commons/7/76/1k_Dissolve_Noise_Texture.png')" }} />
        
        {!isLandingPage && <Sidebar />}
        
        <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
          {!isLandingPage && (
            <header className="flex h-16 items-center justify-between border-b border-borderBg bg-cardBg/60 px-6 shrink-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      dbStatus === "connected" ? "bg-emerald-500" : "bg-red-500 animate-ping"
                    }`}
                  />
                  <span>DB: {dbStatus === "connected" ? "Connected" : "Offline"}</span>
                </div>
                <div className="rounded-full bg-accentAmber/10 border border-accentAmber/30 px-2.5 py-0.5 text-[10px] font-bold text-accentAmber tracking-wider uppercase">
                  SYNTHETIC PROTOTYPE
                </div>
              </div>

              <div className="flex items-center gap-3">
                {resetMsg && (
                  <span className="text-xs font-medium text-accentTeal animate-pulse">{resetMsg}</span>
                )}
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="flex items-center gap-2 rounded-md bg-slate-800 hover:bg-slate-700/80 px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50 border border-borderBg hover:border-accentTeal"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${resetting ? 'animate-spin' : ''}`} />
                  Reset System DB
                </button>
              </div>
            </header>
          )}

          <main className={`flex-1 overflow-auto relative ${isLandingPage ? 'p-0' : 'p-8'}`}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
