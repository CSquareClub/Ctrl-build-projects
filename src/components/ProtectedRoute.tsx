"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useSetup } from "@/providers/SetupProvider";

export default function ProtectedRoute({
  children,
  requireSetup = false,
}: {
  children: React.ReactNode;
  requireSetup?: boolean;
}) {
  const { user, loading } = useAuth();
  const { status, loading: setupLoading } = useSetup();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, pathname, router, user]);

  useEffect(() => {
    if (!requireSetup) return;
    if (!loading && !setupLoading && user && !status?.complete) {
      router.replace("/setup");
    }
  }, [loading, requireSetup, router, setupLoading, status, user]);

  if (loading || (requireSetup && setupLoading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4 text-sm text-slate-300 shadow-2xl">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
          {requireSetup ? "Preparing your workspace..." : "Checking your session..."}
        </div>
      </div>
    );
  }

  if (!user || (requireSetup && !status?.complete)) {
    return null;
  }

  return <>{children}</>;
}
