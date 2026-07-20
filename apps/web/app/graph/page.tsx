"use client";

import { useEffect, useState } from "react";
import { Network, ShieldAlert, Phone, CreditCard, User, Info, DollarSign } from "lucide-react";

interface Node {
  id: string;
  type: string;
  value: string;
  risk_score: number;
  // Visual positions for rendering
  x?: number;
  y?: number;
}

interface Link {
  id: string;
  source: string;
  target: string;
  type: string;
  risk_score: number;
  details: {
    description?: string;
    attempted_transfer_amount?: number;
    call_duration_sec?: number;
  };
}

export default function FraudNetworkGraph() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGraph = async () => {
    try {
      const res = await fetch("/api/v1/intelligence/graph");
      const data = await res.json();

      // Predefined coordinates to render a structured cluster
      const coords: Record<string, { x: number; y: number }> = {
        // Rajesh Kumar (Name)
        "e11e8400-e29b-41d4-a716-446655440005": { x: 150, y: 150 },
        // Target Citizen Phone
        "e11e8400-e29b-41d4-a716-446655440001": { x: 300, y: 150 },
        // Suspect Scammer Phone
        "e11e8400-e29b-41d4-a716-446655440002": { x: 450, y: 150 },
        // Suspect UPI ID
        "e11e8400-e29b-41d4-a716-446655440003": { x: 450, y: 320 },
        // Suspect Bank Account
        "e11e8400-e29b-41d4-a716-446655440004": { x: 300, y: 320 },
      };

      const mappedNodes = (data.nodes || []).map((node: Node) => ({
        ...node,
        x: coords[node.id]?.x || Math.random() * 400 + 100,
        y: coords[node.id]?.y || Math.random() * 300 + 50,
      }));

      setNodes(mappedNodes);
      setLinks(data.links || []);

      // Default select the scammer suspect node
      const scammer = mappedNodes.find((n: Node) => n.value === "+91-91234-56789");
      if (scammer) setSelectedNode(scammer);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "PHONE":
        return <Phone className="h-4 w-4" />;
      case "BANK_ACCOUNT":
        return <CreditCard className="h-4 w-4" />;
      case "UPI_ID":
        return <DollarSign className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getNodeColor = (score: number) => {
    if (score >= 80) return "text-accentRed fill-accentRed/10 border-accentRed/30";
    if (score >= 40) return "text-accentAmber fill-accentAmber/10 border-accentAmber/30";
    return "text-accentTeal fill-accentTeal/10 border-accentTeal/30";
  };

  return (
    <div className="relative min-h-screen pb-12">
      {/* Background Image for Graph Module with Izanami Blend */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src="/constellation-bg.jpg"
          alt="Minimalist constellation graph"
          className="w-full h-full object-cover opacity-20 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/95 to-background" />
      </div>

      <div className="space-y-12 max-w-[1600px] mx-auto pt-4 relative z-10">
        {/* Title */}
        <div className="border-b border-white/5 pb-8">
          <h1 className="font-serif text-4xl text-white font-medium mb-3 flex items-center gap-4">
            <Network className="h-6 w-6 text-accentGold" strokeWidth={1.5} />
            Cybercrime Fraud Network
          </h1>
          <p className="text-sm text-gray-500 font-light max-w-2xl leading-relaxed tracking-wide">
            Relational intelligence mapping connection links between targets, suspect numbers, wallets, and banks.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Left Column: Interactive SVG Canvas (8 cols) */}
          <div className="lg:col-span-8 flex flex-col h-[600px]">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500 mb-6">
              Interactive Relationship Canvas
            </h2>

            {loading ? (
              <div className="flex-1 flex items-center justify-center text-[10px] uppercase tracking-widest font-light text-gray-500 border border-white/5 bg-background/50 backdrop-blur-sm">
                Loading relationship link graph...
              </div>
            ) : (
              <div className="flex-1 relative bg-background/50 backdrop-blur-sm overflow-hidden border border-white/5">
                <svg className="w-full h-full">
                  {/* Links */}
                  {links.map((link) => {
                    const sourceNode = nodes.find((n) => n.id === link.source);
                    const targetNode = nodes.find((n) => n.id === link.target);
                    if (!sourceNode || !targetNode) return null;

                    return (
                      <g key={link.id}>
                        <line
                          x1={sourceNode.x}
                          y1={sourceNode.y}
                          x2={targetNode.x}
                          y2={targetNode.y}
                          className={`stroke-[1.5] ${
                            link.risk_score >= 80
                              ? "stroke-red-500/40"
                              : link.risk_score >= 40
                              ? "stroke-accentGold/40"
                              : "stroke-white/10"
                          }`}
                        />
                        {/* Midpoint Label for relations */}
                        <text
                          x={(sourceNode.x! + targetNode.x!) / 2}
                          y={(sourceNode.y! + targetNode.y!) / 2 - 8}
                          fill="#9ca3af"
                          className="text-[8px] font-medium text-center uppercase tracking-widest font-sans select-none"
                          textAnchor="middle"
                        >
                          {link.type.replace(/_/g, " ")}
                        </text>
                      </g>
                    );
                  })}

                  {/* Nodes */}
                  {nodes.map((node) => {
                    const isSelected = selectedNode?.id === node.id;
                    const isHighRisk = node.risk_score >= 80;
                    const isMedRisk = node.risk_score >= 40;

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        onClick={() => setSelectedNode(node)}
                        className="cursor-pointer group"
                      >
                        <circle
                          r="24"
                          className={`stroke-[1.5] transition-all duration-300 ${
                            isSelected
                              ? "stroke-accentGold fill-background shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                              : isHighRisk
                              ? "stroke-red-500/50 fill-background hover:stroke-red-500"
                              : isMedRisk
                              ? "stroke-accentGold/50 fill-background hover:stroke-accentGold"
                              : "stroke-white/10 fill-background hover:stroke-white/30"
                          }`}
                        />
                        {/* Node Icon wrapper */}
                        <foreignObject x="-12" y="-12" width="24" height="24">
                          <div
                            className={`flex items-center justify-center h-full w-full transition-colors duration-300 ${
                              isHighRisk
                                ? "text-red-500"
                                : isMedRisk
                                ? "text-accentGold"
                                : "text-gray-400 group-hover:text-white"
                            }`}
                          >
                            {getNodeIcon(node.type)}
                          </div>
                        </foreignObject>

                        {/* Node label */}
                        <text
                          y="42"
                          fill={isSelected ? "#ffffff" : "#9ca3af"}
                          className="text-[9px] font-medium text-center font-mono select-none uppercase tracking-wider transition-colors"
                          textAnchor="middle"
                        >
                          {node.value}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>

          {/* Right Column: Node Details Inspector (4 cols) */}
          <div className="lg:col-span-4 lg:border-l lg:border-white/5 lg:pl-12 pt-6 lg:pt-0">
            <div className="space-y-8">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500">
                Entity Inspector
              </h2>

              {selectedNode ? (
                <div className="space-y-8">
                  <div className="border-b border-white/5 pb-4">
                    <span className="text-[9px] uppercase tracking-widest font-medium text-gray-500 block mb-2">Entity Type</span>
                    <p className="font-serif text-2xl font-light text-white uppercase">{selectedNode.type.replace(/_/g, " ")}</p>
                  </div>

                  <div className="border-b border-white/5 pb-4">
                    <span className="text-[9px] uppercase tracking-widest font-medium text-gray-500 block mb-2">Identified Value</span>
                    <p className="text-lg font-mono font-light text-white select-all">{selectedNode.value}</p>
                  </div>

                  <div className="border-b border-white/5 pb-6">
                    <span className="text-[9px] uppercase tracking-widest font-medium text-gray-500 block mb-3">Network Risk Rating</span>
                    <div className="flex items-center gap-4">
                      <span
                        className={`text-[10px] font-medium uppercase tracking-widest px-3 py-1 border ${
                          selectedNode.risk_score >= 80
                            ? "text-red-500 border-red-500/30"
                            : selectedNode.risk_score >= 40
                            ? "text-accentGold border-accentGold/30"
                            : "text-emerald-500 border-emerald-500/30"
                        }`}
                      >
                        {selectedNode.risk_score >= 80 ? "High Risk" : selectedNode.risk_score >= 40 ? "Suspicious" : "Safe"}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400 tracking-widest">SCORE: {selectedNode.risk_score}%</span>
                    </div>
                  </div>

                  {/* Listing linked relations */}
                  <div className="space-y-4 pt-2">
                    <span className="text-[9px] uppercase tracking-widest font-medium text-gray-500 block">Associated Connections</span>
                    <div className="space-y-3">
                      {links
                        .filter((l) => l.source === selectedNode.id || l.target === selectedNode.id)
                        .map((link, idx) => {
                          const otherNode = nodes.find(
                            (n) => n.id === (link.source === selectedNode.id ? link.target : link.source)
                          );
                          return (
                            <div key={idx} className="border border-white/5 p-4 bg-background/30 hover:bg-white/5 transition-colors">
                              <div className="flex justify-between items-center text-gray-400 font-medium mb-2 border-b border-white/5 pb-2">
                                <span className="uppercase text-[9px] text-accentGold tracking-widest">
                                  {link.type.replace(/_/g, " ")}
                                </span>
                                <span className="text-[9px] font-mono tracking-widest">RISK: {link.risk_score}%</span>
                              </div>
                              <p className="text-[10px] font-light text-gray-300 uppercase tracking-widest mt-3">
                                Connected to: <strong className="text-white font-mono ml-2 font-normal">{otherNode?.value}</strong>
                              </p>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-center text-gray-600 border border-white/5 bg-background/30">
                  <Info className="h-6 w-6 text-accentGold mb-4 opacity-50" strokeWidth={1.5} />
                  <p className="text-[10px] font-light uppercase tracking-widest">Select any network node inside canvas to audit relations details.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
