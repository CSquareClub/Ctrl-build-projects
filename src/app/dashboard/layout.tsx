"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { DashboardLiveProvider } from "@/providers/DashboardLiveProvider";
import { AgentProvider } from "@/providers/AgentProvider";
import { GuideProvider } from "@/providers/GuideProvider";
import { NotificationsProvider } from "@/providers/NotificationsProvider";
import { WorkspaceProvider } from "@/providers/WorkspaceProvider";
import { AgentCommandPanelProvider, useAgentCommandPanel } from "@/providers/AgentCommandPanelProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import AgentCommandPanel from "@/components/AgentCommandPanel";
import { cn } from "@/lib/utils";

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Control Room",
    subtitle: "Real-time health of your product based on user sentiment.",
  },
  "/dashboard/connect": {
    title: "Data Sources",
    subtitle: "Manage the pipelines feeding your product intelligence engine.",
  },
  "/dashboard/github": {
    title: "GitHub Workspace",
    subtitle: "Connect a repository, inspect issue-to-code insights, and open safe pull requests.",
  },
  "/dashboard/mobile": {
    title: "Mobile Inspection",
    subtitle: "Connect your mobile app, run cloud-device inspections, and turn failures into clear actions.",
  },
  "/dashboard/website": {
    title: "Website Inspection",
    subtitle: "Configure your product URL, inspect real website flows, and turn failures into fix-ready actions.",
  },
  "/dashboard/workspace": {
    title: "Team Workspace",
    subtitle: "Collaborate with teammates, review AI approvals, and keep issue ownership clear.",
  },
  "/dashboard/command-center": {
    title: "Command Center",
    subtitle: "Monitor autonomous decisions, inspect reasoning, and ask the system what matters most.",
  },
  "/dashboard/ai-helper": {
    title: "Pulse AI",
    subtitle: "Talk to live product intelligence, run commands, and control the system from the right-side panel.",
  },
  "/dashboard/tickets": {
    title: "Tickets & Actions",
    subtitle: "Track internal issues and push them into the live product intelligence pipeline.",
  },
  "/dashboard/timeline": {
    title: "Timeline & Reports",
    subtitle: "Live system heartbeat and weekly intelligence briefs powered by your product data.",
  },
  "/dashboard/sdk": {
    title: "Website SDK",
    subtitle: "Ship AgenticPulse into any website to capture feedback, events, and front-end issues.",
  },
  "/dashboard/settings": {
    title: "Settings",
    subtitle: "Configure your workspace, integrations, agent behaviour, and account.",
  },
};

function getPageMeta(pathname: string) {
  if (pathname.startsWith("/dashboard/issues/")) {
    return {
      title: "Issue Detail",
      subtitle: "Deep context, evidence, and recommended actions for your team.",
    };
  }

  const matchedPath = Object.keys(pageMeta)
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname === path || pathname.startsWith(`${path}/`));

  return matchedPath ? pageMeta[matchedPath] : pageMeta["/dashboard"];
}

function DashboardShell({
  children,
  meta,
}: {
  children: React.ReactNode;
  meta: { title: string; subtitle: string };
}) {
  const { open, expanded } = useAgentCommandPanel();

  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-900 transition-colors selection:bg-red-500/20 selection:text-red-200 dark:bg-[#161616] dark:text-slate-50">
      <Sidebar />
      <main
        className={cn(
          "min-w-0 flex-1 overflow-y-auto p-4 transition-[padding-right] duration-300 ease-out md:p-6 lg:px-10",
          open ? (expanded ? "lg:pr-6" : "lg:pr-4") : ""
        )}
      >
        <div className="mx-auto max-w-7xl">
          <ProtectedRoute>
            <Navbar title={meta.title} subtitle={meta.subtitle} />
            {children}
          </ProtectedRoute>
        </div>
      </main>
      <ProtectedRoute>
        <AgentCommandPanel />
      </ProtectedRoute>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const meta = getPageMeta(pathname);

  return (
    <DashboardLiveProvider>
      <AgentProvider>
        <NotificationsProvider>
          <WorkspaceProvider>
            <GuideProvider>
              <AgentCommandPanelProvider>
                <DashboardShell meta={meta}>{children}</DashboardShell>
              </AgentCommandPanelProvider>
            </GuideProvider>
          </WorkspaceProvider>
        </NotificationsProvider>
      </AgentProvider>
    </DashboardLiveProvider>
  );
}
