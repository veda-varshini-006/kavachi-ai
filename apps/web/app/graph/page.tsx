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
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Network className="h-6 w-6 text-accentTeal" />
          Cybercrime Fraud Network
        </h1>
        <p className="text-sm text-gray-400">
          Relational intelligence mapping connection links between targets, suspect numbers, wallets, and banks.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Interactive SVG Canvas (8 cols) */}
        <div className="lg:col-span-8 rounded-xl border border-borderBg bg-cardBg p-6 flex flex-col h-[500px]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
            Interactive Relationship Canvas
          </h2>

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
              Loading relationship link graph...
            </div>
          ) : (
            <div className="flex-1 relative bg-background/50 rounded-lg overflow-hidden border border-borderBg/50">
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
                        className={`stroke-2 ${
                          link.risk_score >= 80
                            ? "stroke-accentRed/50"
                            : link.risk_score >= 40
                            ? "stroke-accentAmber/50"
                            : "stroke-slate-700"
                        }`}
                      />
                      {/* Midpoint Label for relations */}
                      <text
                        x={(sourceNode.x! + targetNode.x!) / 2}
                        y={(sourceNode.y! + targetNode.y!) / 2 - 5}
                        fill="#64748b"
                        className="text-[9px] font-bold text-center uppercase tracking-wider font-sans select-none"
                        textAnchor="middle"
                      >
                        {link.type}
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
                      className="cursor-pointer"
                    >
                      <circle
                        r="20"
                        className={`stroke-2 transition ${
                          isSelected
                            ? "stroke-accentTeal fill-slate-800"
                            : isHighRisk
                            ? "stroke-accentRed/80 fill-background"
                            : isMedRisk
                            ? "stroke-accentAmber/80 fill-background"
                            : "stroke-slate-700 fill-background"
                        }`}
                      />
                      {/* Node Icon wrapper */}
                      <foreignObject x="-10" y="-10" width="20" height="20">
                        <div
                          className={`flex items-center justify-center h-full w-full ${
                            isHighRisk
                              ? "text-accentRed"
                              : isMedRisk
                              ? "text-accentAmber"
                              : "text-accentTeal"
                          }`}
                        >
                          {getNodeIcon(node.type)}
                        </div>
                      </foreignObject>

                      {/* Node label */}
                      <text
                        y="35"
                        fill="#e2e8f0"
                        className="text-[10px] font-semibold text-center font-sans select-none"
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
        <div className="lg:col-span-4">
          <div className="rounded-xl border border-borderBg bg-cardBg p-6 space-y-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Entity Inspector
            </h2>

            {selectedNode ? (
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500">Entity Type</span>
                  <p className="text-sm font-bold text-white uppercase">{selectedNode.type}</p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500">Identified Value</span>
                  <p className="text-sm font-mono text-white select-all">{selectedNode.value}</p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500">Network Risk Rating</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                        selectedNode.risk_score >= 80
                          ? "bg-accentRed/10 text-accentRed"
                          : selectedNode.risk_score >= 40
                          ? "bg-accentAmber/10 text-accentAmber"
                          : "bg-emerald-500/10 text-emerald-500"
                      }`}
                    >
                      {selectedNode.risk_score >= 80 ? "High Risk" : selectedNode.risk_score >= 40 ? "Suspicious" : "Safe"}
                    </span>
                    <span className="text-xs text-gray-400">Score: {selectedNode.risk_score}%</span>
                  </div>
                </div>

                {/* Listing linked relations */}
                <div className="border-t border-borderBg/50 pt-4 space-y-3">
                  <span className="text-[10px] uppercase font-bold text-gray-500">Associated Connections</span>
                  <div className="space-y-2">
                    {links
                      .filter((l) => l.source === selectedNode.id || l.target === selectedNode.id)
                      .map((link, idx) => {
                        const otherNode = nodes.find(
                          (n) => n.id === (link.source === selectedNode.id ? link.target : link.source)
                        );
                        return (
                          <div key={idx} className="rounded bg-background/40 p-2.5 border border-borderBg/50 text-xs">
                            <div className="flex justify-between text-gray-400 font-semibold mb-1">
                              <span className="uppercase text-[9px] text-accentTeal tracking-wider">
                                {link.type}
                              </span>
                              <span>Risk: {link.risk_score}%</span>
                            </div>
                            <p className="text-gray-300">
                              Connected to: <strong className="text-white font-mono">{otherNode?.value}</strong>
                            </p>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-center text-gray-600">
                <Info className="h-8 w-8 text-gray-700 mb-2" />
                <p className="text-xs">Select any network node inside canvas to audit relations details.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
