"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

export default function GitHubAuthCallbackPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 text-slate-900 dark:bg-[#161616] dark:text-white">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600 shadow-lg dark:border-slate-800 dark:bg-transparent dark:text-slate-300">
        Finishing GitHub sign-in...
      </div>
    </div>
  );
}
