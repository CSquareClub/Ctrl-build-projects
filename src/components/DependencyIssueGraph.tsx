"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import type { IssueGraphData, IssueGraphEdge, IssueGraphNode } from "@/lib/api";

const ForceGraph2D: any = dynamic(
  async () => {
    const mod = await import("react-force-graph");
    return mod.ForceGraph2D as never;
  },
  { ssr: false }
);

type GraphFilters = {
  onlyIssues: boolean;
  onlyDependencies: boolean;
  onlyAffected: boolean;
};

function getNodeColor(node: IssueGraphNode, selected: boolean, highlighted: boolean) {
  if (selected) return "#2563EB";
  if (highlighted) return "#3B82F6";

  switch (node.status) {
    case "resolved":
      return "#22C55E";
    case "affected":
      return "#FACC15";
    case "active":
      return "#2563EB";
    case "issue":
      return "#EF4444";
    default:
      return "#94A3B8";
  }
}

function getLinkColor(edge: IssueGraphEdge, highlighted: boolean) {
  if (highlighted) return "#2563EB";

  switch (edge.type) {
    case "root-cause":
      return "#EF4444";
    case "issue-flow":
      return "#FACC15";
    case "import":
      return "#94A3B8";
    default:
      return "#CBD5E1";
  }
}

export default function DependencyIssueGraph({
  graph,
  selectedNodeId,
  highlightedNodeIds,
  highlightedEdgeIds,
  focusVersion,
  filters,
  rootCauseMode,
  onNodeClick,
  onNodeHover,
}: {
  graph: IssueGraphData | null;
  selectedNodeId: string | null;
  highlightedNodeIds: string[];
  highlightedEdgeIds: string[];
  focusVersion: number;
  filters: GraphFilters;
  rootCauseMode: boolean;
  onNodeClick: (node: IssueGraphNode) => void;
  onNodeHover: (node: IssueGraphNode | null) => void;
}) {
  const graphRef = useRef<any>(null);

  const filteredGraph = useMemo(() => {
    if (!graph) return { nodes: [], links: [] };

    let nodes = [...graph.nodes];
    let links = graph.edges.map((edge) => ({ ...edge }));

    if (filters.onlyIssues) {
      const allowed = new Set(
        nodes
          .filter((node) => node.type === "issue" || node.status === "issue")
          .map((node) => node.id)
      );
      nodes = nodes.filter((node) => allowed.has(node.id));
      links = links.filter(
        (edge) => allowed.has(String(edge.source)) && allowed.has(String(edge.target))
      );
    }

    if (filters.onlyDependencies) {
      links = links.filter((edge) => edge.type === "import");
      const allowed = new Set(
        links.flatMap((edge) => [String(edge.source), String(edge.target)])
      );
      nodes = nodes.filter((node) => allowed.has(node.id));
    }

    if (filters.onlyAffected) {
      const allowed = new Set(
        nodes
          .filter((node) => node.affected || node.rootCause || node.type === "issue")
          .map((node) => node.id)
      );
      nodes = nodes.filter((node) => allowed.has(node.id));
      links = links.filter(
        (edge) =>
          allowed.has(String(edge.source)) &&
          allowed.has(String(edge.target)) &&
          (edge.type === "issue-flow" || edge.type === "root-cause")
      );
    }

    return {
      nodes,
      links,
    };
  }, [filters.onlyAffected, filters.onlyDependencies, filters.onlyIssues, graph]);

  useEffect(() => {
    const selectedNode = filteredGraph.nodes.find((node) => node.id === selectedNodeId);
    if (!selectedNode || !graphRef.current) return;

    const zoomTarget = selectedNode.type === "issue" ? 2.2 : 3.2;
    const timer = window.setTimeout(() => {
      graphRef.current.centerAt(selectedNode.x || 0, selectedNode.y || 0, 700);
      graphRef.current.zoom(zoomTarget, 700);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [filteredGraph.nodes, focusVersion, selectedNodeId]);

  return (
    <div
      className={cn(
        "relative min-h-[620px] overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-sm dark:border-slate-800 dark:from-[#090909] dark:via-[#0d1117] dark:to-[#121821]"
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-white/90 to-transparent dark:from-[#090909]/90" />
      <div className="absolute inset-0">
        {graph ? (
          <ForceGraph2D
            ref={graphRef}
            graphData={filteredGraph}
            backgroundColor="transparent"
            cooldownTicks={120}
            d3AlphaDecay={0.04}
            d3VelocityDecay={0.2}
            linkDirectionalParticles={(link: IssueGraphEdge) =>
              rootCauseMode || highlightedEdgeIds.includes(link.id)
                ? link.type === "import"
                  ? 0
                  : 3
                : 0
            }
            linkDirectionalParticleSpeed={() => 0.008}
            linkDirectionalParticleWidth={() => 2.5}
            linkWidth={(link: IssueGraphEdge) =>
              highlightedEdgeIds.includes(link.id)
                ? 3.8
                : link.type === "root-cause"
                  ? 2.8
                  : link.type === "issue-flow"
                    ? 2.2
                    : 1.2
            }
            linkColor={(link: IssueGraphEdge) =>
              getLinkColor(link, highlightedEdgeIds.includes(link.id))
            }
            nodeRelSize={7}
            nodeCanvasObject={(node: IssueGraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const label = node.label || node.id;
              const fontSize = Math.max(11 / globalScale, 3.5);
              const selected = node.id === selectedNodeId;
              const highlighted = highlightedNodeIds.includes(node.id);
              const color = getNodeColor(node, selected, highlighted);
              ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;

              ctx.beginPath();
              ctx.arc(node.x || 0, node.y || 0, selected ? 9 : 7, 0, 2 * Math.PI, false);
              ctx.fillStyle = color;
              ctx.fill();

              ctx.lineWidth = selected ? 3 : 1.5;
              ctx.strokeStyle = selected ? "rgba(37,99,235,0.28)" : "rgba(148,163,184,0.24)";
              ctx.stroke();

              const textWidth = ctx.measureText(label).width;
              const bckgDimensions: [number, number] = [
                textWidth + fontSize * 1.2,
                fontSize + 7,
              ];

              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle =
                typeof document !== "undefined" &&
                document.documentElement.classList.contains("dark")
                  ? "rgba(15,23,42,0.85)"
                  : "rgba(255,255,255,0.88)";
              ctx.fillRect(
                (node.x || 0) - bckgDimensions[0] / 2,
                (node.y || 0) + 11,
                bckgDimensions[0],
                bckgDimensions[1]
              );
              ctx.fillStyle =
                typeof document !== "undefined" &&
                document.documentElement.classList.contains("dark")
                  ? "#E2E8F0"
                  : "#0F172A";
              ctx.fillText(label, node.x || 0, (node.y || 0) + 11 + bckgDimensions[1] / 2);
            }}
            nodePointerAreaPaint={(node: IssueGraphNode, color: string, ctx: CanvasRenderingContext2D) => {
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(node.x || 0, node.y || 0, 14, 0, 2 * Math.PI, false);
              ctx.fill();
            }}
            nodeLabel={(node: IssueGraphNode) =>
              `<div style="padding:8px 10px;border-radius:12px;background:#0f172a;color:#fff;font-size:12px;max-width:220px">
                <div style="font-weight:600;margin-bottom:4px">${node.label}</div>
                <div>${node.type === "file" ? node.path || "Selected file" : "Issue node"}</div>
              </div>`
            }
            onNodeClick={(node: IssueGraphNode) => onNodeClick(node)}
            onNodeHover={(node: IssueGraphNode | null) => onNodeHover(node)}
          />
        ) : null}
      </div>
    </div>
  );
}
