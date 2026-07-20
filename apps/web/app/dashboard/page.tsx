"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Shield, Users, MapPin, Scan, Activity, AlertTriangle, ArrowRight } from "lucide-react";
import { motion, animate } from "framer-motion";
import Image from "next/image";

function AnimatedNumber({ value, prefix = "" }: { value: number, prefix?: string }) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  
  useEffect(() => {
    const node = nodeRef.current;
    if (node) {
      const controls = animate(0, value, {
        duration: 2.5,
        ease: [0.16, 1, 0.3, 1],
        onUpdate(val) {
          node.textContent = prefix + Math.round(val).toLocaleString();
        }
      });
      return () => controls.stop();
    }
  }, [value, prefix]);

  return <span ref={nodeRef}>{prefix}0</span>;
}

export default function OverviewPage() {
  const [stats, setStats] = useState({
    activeSessions: 0,
    blockedAccounts: 0,
    activeCases: 0,
    currencyScans: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const [sessRes, caseRes, graphRes, mapRes] = await Promise.all([
        fetch("/api/v1/sessions?page_size=1"),
        fetch("/api/v1/cases?page_size=1"),
        fetch("/api/v1/intelligence/graph"),
        fetch("/api/v1/intelligence/map")
      ]);

      const sessData = await sessRes.json();
      const caseData = await caseRes.json();
      const graphData = await graphRes.json();
      const mapData = await mapRes.json();

      setStats({
        activeSessions: sessData.total || 0,
        blockedAccounts: Array.isArray(graphData.links) ? graphData.links.filter((l: any) => l.type === "TRANSACTED_WITH").length : 0,
        activeCases: caseData.total || 0,
        currencyScans: Array.isArray(mapData) ? mapData.filter((m: any) => m.event_type === "NOTE_SCAN").length : 0
      });
    } catch (e) {
      console.error("Failed to load dashboard statistics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <div className="relative min-h-screen pb-20">
      {/* Background Image for Dashboard */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Image
          src="/cybersecurity-art.jpg"
          alt="Cybersecurity Operations"
          fill
          className="object-cover opacity-30 mix-blend-luminosity"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background/95" />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-8 max-w-[1600px] mx-auto pt-8 px-6 lg:px-12 relative z-10"
      >
        {/* Header Banner - Minimalist */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6">
          <div>
            <h1 className="font-serif text-5xl text-white font-medium mb-4 tracking-tight drop-shadow-lg">Intelligence <span className="italic text-accentGold">Hub.</span></h1>
            <p className="text-sm text-gray-300 font-light max-w-2xl leading-relaxed tracking-wide drop-shadow-md">
              Multi-source digital public-safety intelligence. Overseeing scam coercion, suspect currency, 
              fraud networks, and geospatial response.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.2em] text-accentGold font-light shrink-0">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Live System Overview // {new Date().getFullYear()}
          </div>
        </motion.div>

        {/* Bento Box Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          
          {/* Large Card 1: Live Intercepts */}
          <motion.div variants={itemVariants} className="col-span-1 md:col-span-2 lg:col-span-2 relative group overflow-hidden border border-white/5 bg-black/40 backdrop-blur-md p-8 min-h-[280px] flex flex-col justify-between hover:border-accentGold/40 transition-colors duration-700">
            <div className="absolute inset-0 z-0">
              <Image src="/call-bg.jpg" alt="Intercepts" fill sizes="100vw" className="object-cover opacity-20 group-hover:opacity-40 group-hover:scale-105 transition-all duration-1000 mix-blend-screen" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            </div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-accentGold" strokeWidth={1.5} />
                <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-gray-300">Live Intercepts</h2>
              </div>
              <Link href="/call-simulator" className="p-2 bg-white/5 hover:bg-accentGold hover:text-black transition-colors rounded-full backdrop-blur-sm">
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative z-10">
              <p className="font-serif text-7xl text-white font-light tracking-tight drop-shadow-2xl">
                {loading ? "..." : <AnimatedNumber value={stats.activeSessions} />}
              </p>
              <p className="text-sm text-gray-400 font-light mt-2">Active monitored sessions</p>
            </div>
          </motion.div>

          {/* Large Card 2: Prevented Loss */}
          <motion.div variants={itemVariants} className="col-span-1 md:col-span-2 lg:col-span-2 relative group overflow-hidden border border-white/5 bg-black/40 backdrop-blur-md p-8 min-h-[280px] flex flex-col justify-between hover:border-accentGold/40 transition-colors duration-700">
            <div className="absolute top-6 right-6 px-2 py-1 border border-accentGold/30 text-accentGold text-[9px] uppercase tracking-widest bg-accentGold/10 backdrop-blur-md z-10">Simulated</div>
            <div className="absolute inset-0 z-0">
              <Image src="/counterfeit-bg.jpg" alt="Loss Prevention" fill sizes="100vw" className="object-cover opacity-15 group-hover:opacity-30 group-hover:scale-105 transition-all duration-1000 mix-blend-screen" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            </div>
            <div className="relative z-10 flex items-center gap-3">
              <svg className="h-5 w-5 text-accentGold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-gray-300">Prevented Loss</h2>
            </div>
            <div className="relative z-10">
              <p className="font-serif text-7xl text-white font-light tracking-tight drop-shadow-2xl">
                {loading ? "..." : <AnimatedNumber value={(stats.blockedAccounts * 15000) + (stats.activeCases * 50000)} prefix="₹" />}
              </p>
              <p className="text-sm text-gray-400 font-light mt-2">Total estimated asset recovery</p>
            </div>
          </motion.div>

          {/* Standard Card: Blocked Accounts */}
          <motion.div variants={itemVariants} className="col-span-1 lg:col-span-1 relative group overflow-hidden border border-white/5 bg-black/40 backdrop-blur-md p-6 min-h-[200px] flex flex-col justify-between hover:border-accentGold/40 transition-colors duration-700">
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-gray-400 group-hover:text-accentGold transition-colors" strokeWidth={1.5} />
                <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400">Blocked</h2>
              </div>
            </div>
            <p className="font-serif text-5xl text-white font-light tracking-tight relative z-10">
              {loading ? "..." : <AnimatedNumber value={stats.blockedAccounts} />}
            </p>
          </motion.div>

          {/* Standard Card: SOC Cases */}
          <motion.div variants={itemVariants} className="col-span-1 lg:col-span-1 relative group overflow-hidden border border-white/5 bg-black/40 backdrop-blur-md p-6 min-h-[200px] flex flex-col justify-between hover:border-accentGold/40 transition-colors duration-700">
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-gray-400 group-hover:text-accentGold transition-colors" strokeWidth={1.5} />
                <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400">SOC Cases</h2>
              </div>
            </div>
            <p className="font-serif text-5xl text-white font-light tracking-tight relative z-10">
              {loading ? "..." : <AnimatedNumber value={stats.activeCases} />}
            </p>
          </motion.div>

          {/* Wide Card: Spatial Intelligence */}
          <motion.div variants={itemVariants} className="col-span-1 md:col-span-2 lg:col-span-2 relative group overflow-hidden border border-white/5 bg-black/40 backdrop-blur-md p-8 min-h-[250px] flex flex-col justify-between hover:border-accentGold/40 transition-colors duration-700">
             <div className="absolute inset-0 z-0">
              <Image src="/city-bg.jpg" alt="Spatial Intelligence" fill sizes="100vw" className="object-cover opacity-20 group-hover:opacity-40 group-hover:scale-105 transition-all duration-1000 mix-blend-screen" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 to-transparent" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <MapPin className="h-5 w-5 text-accentGold" strokeWidth={1.5} />
                <h2 className="text-xs uppercase tracking-[0.2em] font-medium text-gray-300">Spatial Intelligence</h2>
              </div>
              <h3 className="font-serif text-3xl text-white mb-2">Regional Mapping</h3>
              <p className="text-sm text-gray-400 font-light leading-relaxed max-w-sm">
                Access spatial response overlays and global cybercrime linkages.
              </p>
            </div>
            <div className="relative z-10 mt-6 flex gap-4">
              <Link href="/map" className="px-6 py-2 bg-white/10 hover:bg-white hover:text-black border border-white/20 hover:border-white transition-all text-xs tracking-widest uppercase rounded-full">
                View Map
              </Link>
              <Link href="/graph" className="px-6 py-2 bg-transparent hover:bg-accentGold/20 border border-transparent hover:border-accentGold/50 text-accentGold transition-all text-xs tracking-widest uppercase rounded-full">
                View Graph
              </Link>
            </div>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
}
