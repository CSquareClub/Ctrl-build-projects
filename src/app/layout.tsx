import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import { IssuesProvider } from "@/providers/IssuesProvider";
import { SetupProvider } from "@/providers/SetupProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LiveEventsProvider } from "@/providers/LiveEventsProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";

export const metadata: Metadata = {
  title: "Product Pulse   AI Product Intelligence",
  description:
    "Real-time AI-powered product intelligence. Catch issues before they become crises.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-slate-50 text-slate-900 antialiased"
      >
        <ThemeProvider>
          <AuthProvider>
            <LiveEventsProvider>
              <SetupProvider>
                <IssuesProvider>
                  <TooltipProvider delay={0}>{children}</TooltipProvider>
                </IssuesProvider>
              </SetupProvider>
            </LiveEventsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
