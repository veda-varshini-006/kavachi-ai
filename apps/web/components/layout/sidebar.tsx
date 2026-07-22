"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PhoneCall,
  ShieldAlert,
  Briefcase,
  Network,
  Map,
  Scan,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import clsx from "clsx";

export default function Sidebar() {
  const pathname = usePathname();

  const navigation = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Call Simulator", href: "/call-simulator", icon: PhoneCall },
    { name: "SOC Dashboard", href: "/soc", icon: ShieldAlert },
    { name: "Cases", href: "/cases", icon: Briefcase },
    { name: "Fraud Network", href: "/graph", icon: Network },
    { name: "Geospatial Map", href: "/map", icon: Map },
    { name: "Note Screening", href: "/counterfeit", icon: Scan },
    { name: "Methodology", href: "/methodology", icon: BookOpen },
  ];

  return (
    <div className="flex h-full w-64 flex-col border-r border-borderBg bg-cardBg/95 backdrop-blur-xl text-gray-100 shadow-xl z-50">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-2 border-b border-borderBg px-6">
        <ShieldCheck className="h-8 w-8 text-accentGold animate-pulse" />
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white leading-none">KAVACH AI</h1>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-400">
            Public Safety Intel
          </span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 drop-shadow-md",
                isActive
                  ? "bg-accentGold/10 text-accentGold border-l-4 border-accentGold drop-shadow-glow"
                  : "text-white/90 hover:bg-accentGold/10 hover:text-white"
              )}
            >
              <Icon
                className={clsx(
                  "h-5 w-5 shrink-0 transition-colors duration-200 drop-shadow-sm",
                  isActive ? "text-accentGold" : "text-white/80 group-hover:text-accentGold"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer System Disclaimer */}
      <div className="border-t border-borderBg p-4 bg-background/30 text-center">
        <span className="text-[10px] font-semibold text-accentAmber uppercase tracking-wider block mb-1">
          ⚠️ SYNTHETIC PROTOTYPE
        </span>
        <p className="text-[9px] text-gray-500 leading-normal">
          For decision support only. No real banking, police or forensic action occurs.
        </p>
      </div>
    </div>
  );
}
