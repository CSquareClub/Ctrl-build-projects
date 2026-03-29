import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import { IssuesProvider } from "@/providers/IssuesProvider";
import { TooltipProvider } from "@/components/ui/tooltip";

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
    <html lang="en">
      <body
        suppressHydrationWarning
        className="min-h-screen bg-slate-50 text-slate-900 antialiased"
      >
        <AuthProvider>
          <IssuesProvider>
            <TooltipProvider delay={0}>{children}</TooltipProvider>
          </IssuesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
