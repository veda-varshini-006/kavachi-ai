"use client";

import React, { useEffect, useState } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import { AlertCircle, Filter, Maximize2, ShieldAlert } from "lucide-react";

export default function GraphDashboard() {
  const [elements, setElements] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [clusters, setClusters] = useState([]);

  useEffect(() => {
    fetch("/api/v1/intelligence/graph")
      .then((res) => res.json())
      .then((data) => {
        const cyNodes = data.nodes.map((n) => ({
          data: {
            id: n.id,
            label: n.value,
            type: n.type,
            risk_score: n.risk_score,
          },
        }));
        const cyEdges = data.links.map((e) => ({
          data: {
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.type,
            risk_score: e.risk_score,
            evidence: e.evidence_source,
            explanation: e.explanation,
            confidence: e.confidence,
            method: e.method,
            is_reviewed: e.is_reviewed,
            is_rejected: e.is_rejected
          },
        }));
        setElements([...cyNodes, ...cyEdges]);
      });

    fetch("/api/v1/intelligence/graph/clusters")
      .then((res) => res.json())
      .then((data) => {
        setClusters(data);
      });
  }, []);

  const layout = {
    name: "cose",
    idealEdgeLength: 100,
    nodeOverlap: 20,
    refresh: 20,
    fit: true,
    padding: 30,
    randomize: false,
    componentSpacing: 100,
    nodeRepulsion: 400000,
    edgeElasticity: 100,
    nestingFactor: 5,
    gravity: 80,
    numIter: 1000,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.0,
  };

  const stylesheet = [
    {
      selector: "node",
      style: {
        label: "data(label)",
        "background-color": "#4f46e5",
        color: "#fff",
        "text-valign": "center",
        "text-halign": "center",
        "font-size": "10px",
        width: "60px",
        height: "60px",
        "text-wrap": "wrap",
        "text-max-width": "50px",
      },
    },
    {
      selector: "node[risk_score > 80]",
      style: {
        "background-color": "#ef4444",
      },
    },
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": "#9ca3af",
        "target-arrow-color": "#9ca3af",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
        label: "data(label)",
        "font-size": "8px",
        "text-rotation": "autorotate",
        color: "#4b5563",
        "text-background-opacity": 1,
        "text-background-color": "#ffffff",
      },
    },
    {
      selector: "edge[risk_score > 90]",
      style: {
        "line-color": "#ef4444",
        "target-arrow-color": "#ef4444",
      },
    },
    {
      selector: "edge[is_rejected = 'true']",
      style: {
        "line-color": "#d1d5db",
        "target-arrow-color": "#d1d5db",
        "line-style": "dashed",
        opacity: 0.5,
      },
    }
  ];

  const handleReview = (edgeId, action) => {
    fetch(`/api/v1/intelligence/graph/review-link/${edgeId}?action=${action}`, {
      method: 'POST'
    }).then(res => res.json()).then(data => {
      // Re-fetch or update state
      if (data.status === 'success') {
         setElements(prev => prev.map(el => {
           if (el.data.id === edgeId) {
             return { ...el, data: { ...el.data, is_reviewed: data.is_reviewed, is_rejected: data.is_rejected } }
           }
           return el;
         }));
         setSelectedEdge(prev => ({ ...prev, is_reviewed: data.is_reviewed, is_rejected: data.is_rejected }));
      }
    })
  };

  return (
    <div className="flex h-screen w-full bg-slate-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10 overflow-y-auto">
        <div className="p-4 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="text-indigo-600" />
            Graph Intelligence
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Network analytics and campaign clustering.
          </p>
        </div>

        {/* Selected Edge / Node Drawer */}
        {selectedEdge && (
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-800 uppercase mb-2">Edge Details</h3>
            <div className="text-sm">
              <p><span className="font-medium">Type:</span> {selectedEdge.label}</p>
              <p><span className="font-medium">Explanation:</span> {selectedEdge.explanation}</p>
              <p><span className="font-medium">Evidence:</span> {selectedEdge.evidence}</p>
              <p><span className="font-medium">Confidence:</span> {(selectedEdge.confidence * 100).toFixed(1)}%</p>
              <p><span className="font-medium">Method:</span> {selectedEdge.method}</p>
              
              {selectedEdge.label === "POSSIBLE_SAME_ACTOR" && !selectedEdge.is_reviewed && (
                <div className="mt-4 flex gap-2">
                  <button onClick={() => handleReview(selectedEdge.id, 'CONFIRM')} className="bg-green-600 text-white px-3 py-1 rounded text-xs">Confirm Link</button>
                  <button onClick={() => handleReview(selectedEdge.id, 'REJECT')} className="bg-red-600 text-white px-3 py-1 rounded text-xs">Reject Link</button>
                </div>
              )}
              {selectedEdge.is_reviewed && (
                <div className="mt-4 text-xs font-semibold text-slate-600">
                  Link has been {selectedEdge.is_rejected ? "REJECTED" : "CONFIRMED"} by analyst.
                </div>
              )}
            </div>
          </div>
        )}

        {selectedNode && (
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-800 uppercase mb-2">Entity Details</h3>
            <div className="text-sm">
              <p><span className="font-medium">Value:</span> {selectedNode.label}</p>
              <p><span className="font-medium">Type:</span> {selectedNode.type}</p>
              <p><span className="font-medium">Risk Score:</span> {selectedNode.risk_score}</p>
            </div>
          </div>
        )}

        {/* Clusters list */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-slate-800 uppercase mb-3 flex items-center gap-2">
            <Filter size={16} /> Campaign Clusters
          </h3>
          <div className="space-y-3">
            {clusters.map((c) => (
              <div key={c.cluster_id} className="bg-white border border-slate-200 rounded p-3 text-sm shadow-sm">
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>{c.cluster_id}</span>
                  <span className="text-red-600">Risk: {c.risk_score.toFixed(0)}</span>
                </div>
                <p className="text-slate-600 text-xs mb-2">{c.explanation}</p>
                <div className="text-xs text-slate-500">
                  Central nodes:
                  <ul className="list-disc pl-4 mt-1">
                    {c.central_nodes.map((n) => (
                      <li key={n.id}>{n.value}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 relative bg-slate-100">
        <CytoscapeComponent
          elements={elements}
          style={{ width: "100%", height: "100%" }}
          layout={layout}
          stylesheet={stylesheet}
          cy={(cy) => {
            cy.on("tap", "node", (evt) => {
              setSelectedNode(evt.target.data());
              setSelectedEdge(null);
            });
            cy.on("tap", "edge", (evt) => {
              setSelectedEdge(evt.target.data());
              setSelectedNode(null);
            });
            cy.on("tap", (evt) => {
              if (evt.target === cy) {
                setSelectedNode(null);
                setSelectedEdge(null);
              }
            });
          }}
        />
        <div className="absolute top-4 right-4 bg-white p-2 rounded shadow text-xs font-semibold text-slate-700">
          <Maximize2 size={16} className="inline mr-1" />
          Interactive Network Graph
        </div>
      </div>
    </div>
  );
}
