"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

const revealContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.1 }
  }
};

const revealItem = {
  hidden: { y: "120%" },
  visible: { y: 0, transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] } }
};

const fadeItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 1, ease: [0.16, 1, 0.3, 1] } }
};

function CinematicSection({
  imageSrc,
  title,
  subtitle,
  description,
  alignment = "left",
  index,
  features = [],
  stats = []
}: {
  imageSrc: string;
  title: string;
  subtitle: string;
  description: string;
  alignment?: "left" | "right" | "center";
  index: string;
  features?: { title: string; desc: string }[];
  stats?: { label: string; value: string }[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const y = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);

  return (
    <div ref={containerRef} className="relative min-h-screen w-full overflow-hidden flex flex-col justify-center py-32 border-b border-white/5">
      {/* Parallax Background */}
      <motion.div style={{ scale, y }} className="absolute inset-0 z-0 origin-center">
        <Image src={imageSrc} alt={title} fill className="object-cover mix-blend-luminosity opacity-80" />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
      </motion.div>

      {/* Content */}
      <motion.div 
        style={{ opacity }}
        variants={revealContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className={`relative z-10 w-full max-w-[1600px] mx-auto px-6 flex flex-col ${
          alignment === "left" ? "items-start text-left" : 
          alignment === "right" ? "items-end text-right" : "items-center text-center"
        }`}
      >
        <div className="overflow-hidden mb-8">
          <motion.div variants={revealItem} className="flex items-center gap-4">
            <span className="text-[10px] tracking-[0.3em] font-mono text-accentGold border border-accentGold/30 px-3 py-1 rounded-sm">
              [{index}]
            </span>
            <div className="w-16 h-[1px] bg-accentGold/50" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400">{subtitle}</span>
          </motion.div>
        </div>
        
        <div className="overflow-hidden mb-12">
          <motion.h2 variants={revealItem} className="font-serif text-6xl md:text-[8rem] font-medium text-white leading-[0.9] tracking-tighter drop-shadow-2xl">
            {title}
          </motion.h2>
        </div>

        <div className="flex flex-col xl:flex-row gap-16 xl:gap-32 w-full max-w-5xl justify-between items-start">
          
          <div className="flex-1 overflow-hidden">
            <motion.p variants={revealItem} className="text-gray-300 text-lg md:text-2xl font-light leading-relaxed drop-shadow-lg">
              {description}
            </motion.p>
          </div>

          <div className="flex-1 flex flex-col gap-12 w-full">
            {/* Detailed Matter: Features Grid */}
            {features.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-12">
                {features.map((feature, idx) => (
                  <motion.div key={idx} variants={fadeItem} className="flex flex-col gap-4 group">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-accentGold rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
                      <span className="text-[10px] tracking-widest font-mono text-white/70 border border-white/10 px-2 py-1 rounded-sm uppercase bg-white/5 backdrop-blur-sm group-hover:bg-white/10 group-hover:text-white transition-colors">
                        {feature.title}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm font-light leading-loose border-l border-white/10 pl-4">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Detailed Matter: Giant Stats */}
            {stats.length > 0 && (
              <div className="flex gap-16 border-t border-white/10 pt-12 mt-4">
                {stats.map((stat, idx) => (
                  <motion.div key={idx} variants={fadeItem} className="flex flex-col group cursor-default">
                    <span className="font-serif text-5xl md:text-[4rem] text-accentGold mb-2 tracking-tighter group-hover:scale-105 group-hover:text-white transition-all origin-left drop-shadow-lg leading-none">
                      {stat.value}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-gray-500 group-hover:text-gray-300 transition-colors">{stat.label}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

      </motion.div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="bg-black text-gray-100 overflow-x-hidden selection:bg-accentGold/30 font-sans relative">
      
      {/* Initial Hero - Massive Lamalama Style */}
      <section className="relative h-screen w-full flex flex-col justify-between p-6 md:p-12 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 z-0">
          <Image src="/network-bg.jpg" alt="Network" fill className="object-cover opacity-90 mix-blend-screen" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/80" />
        </div>

        {/* Header */}
        <nav className="relative z-10 flex items-center justify-between w-full max-w-[1800px] mx-auto">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5 }} className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-accentGold" />
             <span className="text-[10px] tracking-[0.2em] font-mono uppercase text-gray-300 border border-white/10 px-3 py-1 rounded">Kavach AI</span>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, delay: 0.3 }}>
            <Link href="/dashboard" className="group relative inline-flex items-center gap-4 text-[10px] tracking-[0.15em] font-mono uppercase text-white transition-colors hover:text-accentGold">
              <span>Enter System</span>
              <span className="w-8 h-[1px] bg-white transition-all duration-700 group-hover:w-16 group-hover:bg-accentGold" />
            </Link>
          </motion.div>
        </nav>

        {/* Huge Typography */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center">
          <div className="overflow-hidden w-full px-4 flex justify-center">
            <motion.h1 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }} 
              className="font-serif text-[15vw] md:text-[12vw] lg:text-[10vw] leading-[0.8] text-white tracking-tighter flex flex-col items-center"
            >
              <span>SILENT</span>
              <span className="italic text-accentGold block mt-4">OVERSIGHT.</span>
            </motion.h1>
          </div>
          <div className="overflow-hidden">
            <motion.p
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              transition={{ duration: 1.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mt-12 text-gray-400 uppercase tracking-[0.3em] text-xs max-w-lg mx-auto leading-loose"
            >
              A multi-source intelligence engine detecting coercion, mapping networks, and coordinating geospatial response with uncompromising precision.
            </motion.p>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2, delay: 1.5 }} className="relative z-10 flex flex-col items-center gap-4 mx-auto pb-8">
          <span className="text-[10px] uppercase font-mono tracking-[0.3em] text-gray-500">Scroll down</span>
          <div className="w-[1px] h-16 bg-gray-800 overflow-hidden relative">
            <motion.div animate={{ y: [0, 64, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute top-0 left-0 w-full h-1/2 bg-accentGold" />
          </div>
        </motion.div>
      </section>

      {/* Cinematic Full-Screen Sections with Detailed Matter */}
      <CinematicSection 
        index="01"
        subtitle="Real-time Intercepts"
        title="Predictive Audio."
        description="Stream real-time audio transcripts through our sophisticated NLP engine to instantly flag coercion severity and potential threats before transactions occur."
        imageSrc="/call-bg.jpg"
        alignment="left"
        features={[
          { title: "Sentiment Analysis", desc: "Monitors extreme linguistic stress markers and semantic panic indicators." },
          { title: "Threat Vectors", desc: "Cross-references spoken dialog against a continuously updated dictionary of known extortion patterns." }
        ]}
        stats={[
          { label: "Processing Latency", value: "<12ms" },
          { label: "Threat Accuracy", value: "99.4%" }
        ]}
      />

      <CinematicSection 
        index="02"
        subtitle="Operations Core"
        title="Server Architecture."
        description="Monitor massive data flows through highly encrypted monochromatic server arrays, ensuring zero downtime in critical public safety operations."
        imageSrc="/server-room.jpg"
        alignment="right"
        features={[
          { title: "End-to-end Encryption", desc: "All ingested transcripts and financial metadata are secured with AES-256 protocols." },
          { title: "Distributed Consensus", desc: "Data states are verified across multiple secure nodes to prevent tampering." }
        ]}
        stats={[
          { label: "Node Uptime", value: "99.99%" },
          { label: "Throughput", value: "1.2 TB/s" }
        ]}
      />

      <CinematicSection 
        index="03"
        subtitle="Spatial Response"
        title="City Grids."
        description="Coordinate response forces dynamically. Our regional overlays and hotspot heatmaps provide the geographic clarity needed for immediate, decisive action."
        imageSrc="/city-bg.jpg"
        alignment="left"
        features={[
          { title: "Heatmap Generation", desc: "Correlates IP addresses and cell tower pings to instantly isolate regions with high threat density." },
          { title: "Rapid Deployment", desc: "Automatically alerts local response jurisdictions based on proximity and threat severity." }
        ]}
        stats={[
          { label: "Global Coverage", value: "194" },
          { label: "Update Freq", value: "0.5s" }
        ]}
      />

      <CinematicSection 
        index="04"
        subtitle="System Logic"
        title="Methodology."
        description="We analyze sine wave anomalies and structural audio data to track systemic fraud rings. Complex graph databases expose interconnected suspect networks."
        imageSrc="/methodology-bg.jpg"
        alignment="right"
        features={[
          { title: "Anomaly Detection", desc: "Utilizes advanced ML clustering to identify deviations in baseline human transactional behavior." },
          { title: "Link Analysis", desc: "Transforms isolated data points into deep multi-layer relationship graphs for investigations." }
        ]}
      />

      <CinematicSection 
        index="05"
        subtitle="Currency Screen"
        title="Geometric Nodes."
        description="Trace counterfeit networks utilizing abstract geometric nodal mapping to identify root sources of suspect tender across digital ledgers."
        imageSrc="/counterfeit-bg.jpg"
        alignment="left"
        features={[
          { title: "Ledger Forensics", desc: "Deep-scans distributed ledgers for high-velocity transaction washing patterns." },
          { title: "Node Isolation", desc: "Mathematically isolates compromised nodes and proactively issues digital arrest warrants." }
        ]}
        stats={[
          { label: "Nodes Tracked", value: "8.4M" },
          { label: "Assets Frozen", value: "₹4.2B" }
        ]}
      />

      {/* Massive Cinematic CTA Footer */}
      <footer className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <Image
            src="/cybersecurity-art.jpg"
            alt="Enter System"
            fill
            className="object-cover opacity-80 mix-blend-luminosity scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-200px" }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 text-center flex flex-col items-center gap-16"
        >
          <div className="overflow-hidden">
            <h2 className="font-serif text-[10vw] leading-[0.9] text-white tracking-tighter drop-shadow-2xl">
              COMMAND <br /> <span className="italic text-accentGold">CONTROL.</span>
            </h2>
          </div>
          
          <Link href="/dashboard" className="group relative inline-flex items-center justify-center mt-8">
            <div className="absolute inset-0 bg-accentGold/20 blur-3xl group-hover:bg-accentGold/50 transition-colors duration-1000 rounded-full" />
            <div className="relative border border-accentGold/50 bg-black/50 backdrop-blur-md hover:bg-accentGold hover:text-black transition-all duration-1000 px-16 py-6 rounded-full flex items-center gap-6 text-accentGold tracking-[0.3em] font-mono text-[10px] uppercase font-medium overflow-hidden">
              <span className="relative z-10">Initiate Protocol</span>
              <div className="w-16 h-[1px] bg-accentGold group-hover:bg-black transition-colors duration-1000 relative z-10" />
              <div className="w-2 h-2 rounded-full bg-accentGold group-hover:bg-black transition-colors duration-1000 relative z-10" />
            </div>
          </Link>
        </motion.div>
      </footer>
    </div>
  );
}
