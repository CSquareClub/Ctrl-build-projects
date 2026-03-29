"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Globe2,
  LayoutTemplate,
  Lock,
  Mail,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPasswordRules, isStrongPassword } from "@/lib/password-rules";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { useAuth } from "@/providers/AuthProvider";

type AuthMode = "login" | "signup" | "forgot" | "reset";

const modeCopy: Record<AuthMode, { title: string; cta: string; helper: string }> = {
  login: {
    title: "Welcome back",
    cta: "Sign in",
    helper: "Access your live product signals, issue clusters, and weekly insight reports.",
  },
  signup: {
    title: "Create your workspace",
    cta: "Create account",
    helper: "Set up Product Pulse in minutes and start turning scattered feedback into product intelligence.",
  },
  forgot: {
    title: "Reset your password",
    cta: "Send reset link",
    helper: "We’ll email you a secure reset link so you can get back into your workspace.",
  },
  reset: {
    title: "Choose a new password",
    cta: "Update password",
    helper: "Set a strong password to finish account recovery and continue to the dashboard.",
  },
};

const featureCards = [
  {
    icon: Mail,
    title: "Multi-source ingestion",
    description: "Collect feedback from Gmail, reviews, and social platforms.",
  },
  {
    icon: Sparkles,
    title: "AI-powered insights",
    description: "Automatically detect issues and generate weekly reports.",
  },
  {
    icon: LayoutTemplate,
    title: "Timeline intelligence",
    description: "Visualize product health with real-time issue timelines.",
  },
  {
    icon: Globe2,
    title: "Location insights",
    description: "Understand where issues are happening globally.",
  },
  {
    icon: MessageSquareText,
    title: "Social listening",
    description: "Track what users are saying across Reddit, Twitter, and more.",
  },
  {
    icon: ShieldCheck,
    title: "Website SDK",
    description: "Install a script and capture real-time user feedback instantly.",
  },
] as const;

export default function LoginPage() {
  const {
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    sendPasswordResetEmail,
    updatePassword,
    recoveryMode,
    user,
    loading: authLoading,
  } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nextPath, setNextPath] = useState("/dashboard");
  const [queryMode, setQueryMode] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get("next") || "/dashboard");
    setQueryMode(params.get("mode"));
  }, []);

  useEffect(() => {
    if (recoveryMode) {
      setMode("reset");
      setError("");
      setSuccess("Your reset session is ready. Set a new password to continue.");
      return;
    }

    if (queryMode === "reset") {
      setMode("forgot");
      setSuccess("Reset link sent. Open it from your inbox to choose a new password.");
      return;
    }

    if (queryMode === "forgot") {
      setMode("forgot");
      return;
    }

    if (queryMode === "signup") {
      setMode("signup");
      return;
    }

    setMode("login");
  }, [queryMode, recoveryMode]);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(nextPath);
    }
  }, [authLoading, nextPath, router, user]);

  const passwordRules = useMemo(() => getPasswordRules(password), [password]);

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    resetMessages();
  };

  const handleSubmit = async () => {
    resetMessages();

    if (!email.trim() && mode !== "reset") {
      setError("Please enter your email address.");
      return;
    }

    if (mode === "signup" && !fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (mode === "forgot") {
      setLoading(true);
      try {
        await sendPasswordResetEmail(email.trim());
        setSuccess("Reset link sent. Check your inbox and follow the secure link.");
      } catch (err) {
        setError(toUserFacingError(err, "auth-reset"));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    if ((mode === "signup" || mode === "reset") && !isStrongPassword(password)) {
      setError("Please choose a stronger password that matches all requirements.");
      return;
    }

    if ((mode === "signup" || mode === "reset") && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        await signInWithPassword(email.trim(), password);
      } else if (mode === "signup") {
        const result = await signUpWithPassword(email.trim(), password, fullName.trim());

        if (result.requiresEmailConfirmation) {
          setSuccess(
            "Account created. Check your email to confirm your address before logging in."
          );
          setMode("login");
        } else {
          setSuccess("Account created successfully. Redirecting to dashboard...");
        }
      } else {
        await updatePassword(password);
        setSuccess("Password updated successfully. Redirecting to dashboard...");
      }
    } catch (err) {
      setError(
        toUserFacingError(err, mode === "signup" ? "auth-signup" : "auth-login")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    resetMessages();
    setLoading(true);

    try {
      await signInWithGoogle();
    } catch (err) {
      setError(toUserFacingError(err, "auth-google"));
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_28%)]" />
        <div className="relative z-10 rounded-3xl border border-slate-800 bg-slate-900/90 px-6 py-4 text-sm text-slate-300 shadow-2xl">
          Checking your session...
        </div>
      </div>
    );
  }

  const showPasswordFields = mode === "login" || mode === "signup" || mode === "reset";
  const showPasswordStrength = mode === "signup" || mode === "reset";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="relative flex min-h-screen">
        <div className="relative hidden min-h-screen flex-1 overflow-hidden border-r border-slate-800/80 bg-[linear-gradient(160deg,#09090b_0%,#0f172a_55%,#020617_100%)] px-12 py-10 lg:flex lg:basis-[62%] lg:flex-col">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(34,197,94,0.16),transparent_26%),radial-gradient(circle_at_72%_22%,rgba(56,189,248,0.18),transparent_24%),radial-gradient(circle_at_52%_78%,rgba(99,102,241,0.14),transparent_28%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:38px_38px]" />

          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200 shadow-[0_0_40px_rgba(34,211,238,0.12)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold">Product Pulse</p>
                <p className="text-sm text-slate-400">Built for modern product teams</p>
              </div>
            </div>

            <div className="mt-16 max-w-2xl animate-in fade-in-0 slide-in-from-left-4 duration-700">
              <div className="mb-6 flex flex-wrap gap-3">
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
                  No setup required
                </span>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                  Works instantly
                </span>
                <span className="rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-indigo-200">
                  Lightweight workflows
                </span>
              </div>

              <h1 className="max-w-3xl text-5xl font-black leading-[1.04] tracking-tight text-white xl:text-6xl">
                Turn scattered feedback into product intelligence
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                Product Pulse unifies emails, reviews, and user signals into actionable insights.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-8 text-sm text-slate-300">
                <div>
                  <p className="text-2xl font-semibold text-white">10k+</p>
                  <p className="mt-1 text-slate-400">feedback events processed</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-white">Real-time</p>
                  <p className="mt-1 text-slate-400">issue detection and reporting</p>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-12 grid max-w-5xl flex-1 grid-cols-2 gap-4 xl:mt-16">
              {featureCards.map((feature, index) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={feature.title}
                    className="group rounded-3xl border border-white/8 bg-white/[0.035] p-5 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-cyan-400/20 hover:bg-white/[0.06] hover:shadow-[0_20px_60px_rgba(8,47,73,0.22)] animate-in fade-in-0 slide-in-from-left-3"
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60 text-cyan-200 shadow-inner">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold text-white">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="relative flex min-h-screen flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:basis-[38%]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.16),transparent_26%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.08),transparent_22%)] lg:hidden" />

          <div className="relative z-10 w-full max-w-md">
            <div className="rounded-[28px] border border-slate-800 bg-zinc-900/80 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.55)] backdrop-blur-xl">
              <div className="mb-8">
                <div className="mb-5 flex items-center gap-3 lg:hidden">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Product Pulse</p>
                    <p className="text-xs text-slate-400">Built for modern product teams</p>
                  </div>
                </div>

                {!recoveryMode && (
                  <div className="mb-6 grid grid-cols-3 rounded-full border border-slate-800 bg-slate-950/70 p-1 text-xs sm:text-sm">
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className={cn(
                        "rounded-full px-3 py-2 font-semibold transition-all",
                        mode === "login"
                          ? "bg-[linear-gradient(90deg,#22d3ee_0%,#6366f1_55%,#8b5cf6_100%)] text-white shadow-[0_12px_24px_rgba(99,102,241,0.28)]"
                          : "text-slate-400"
                      )}
                    >
                      Login
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode("signup")}
                      className={cn(
                        "rounded-full px-3 py-2 font-semibold transition-all",
                        mode === "signup"
                          ? "bg-[linear-gradient(90deg,#22d3ee_0%,#6366f1_55%,#8b5cf6_100%)] text-white shadow-[0_12px_24px_rgba(99,102,241,0.28)]"
                          : "text-slate-400"
                      )}
                    >
                      Sign Up
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className={cn(
                        "rounded-full px-3 py-2 font-semibold transition-all",
                        mode === "forgot"
                          ? "bg-[linear-gradient(90deg,#22d3ee_0%,#6366f1_55%,#8b5cf6_100%)] text-white shadow-[0_12px_24px_rgba(99,102,241,0.28)]"
                          : "text-slate-400"
                      )}
                    >
                      Reset
                    </button>
                  </div>
                )}

                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
                  Secure workspace access
                </p>
                <h2 className="mt-3 text-4xl font-black tracking-tight text-white">
                  {modeCopy[mode].title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {modeCopy[mode].helper}
                </p>
                <p className="mt-3 text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
                  No credit card required
                </p>
              </div>

              <div className="space-y-5">
                {(mode === "login" || mode === "signup") && (
                  <>
                    <Button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      variant="outline"
                      className="h-12 w-full rounded-2xl border-slate-700 bg-slate-950/80 text-slate-100 transition hover:scale-[1.01] hover:bg-slate-900"
                    >
                      <span className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-950">
                        G
                      </span>
                      Continue with Google
                    </Button>

                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-slate-800" />
                      <span className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
                        Or continue with email
                      </span>
                      <div className="h-px flex-1 bg-slate-800" />
                    </div>
                  </>
                )}

                {mode === "signup" && (
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">Full name</label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 transition focus-within:border-cyan-400/30 focus-within:shadow-[0_0_0_3px_rgba(34,211,238,0.12)]">
                      <User className="h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Type your full name"
                        className="w-full border-0 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {mode !== "reset" && (
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">Email</label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 transition focus-within:border-cyan-400/30 focus-within:shadow-[0_0_0_3px_rgba(34,211,238,0.12)]">
                      <Mail className="h-4 w-4 text-slate-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Type your email"
                        className="w-full border-0 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {showPasswordFields && (
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">Password</label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 transition focus-within:border-cyan-400/30 focus-within:shadow-[0_0_0_3px_rgba(34,211,238,0.12)]">
                      <Lock className="h-4 w-4 text-slate-500" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={
                          mode === "login" ? "Type your password" : "Create a strong password"
                        }
                        className="w-full border-0 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {(mode === "signup" || mode === "reset") && (
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">Confirm password</label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 transition focus-within:border-cyan-400/30 focus-within:shadow-[0_0_0_3px_rgba(34,211,238,0.12)]">
                      <ShieldCheck className="h-4 w-4 text-slate-500" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Retype your password"
                        className="w-full border-0 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {showPasswordStrength && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Password requirements
                    </p>
                    <div className="space-y-2">
                      {passwordRules.map((rule) => (
                        <div
                          key={rule.label}
                          className={cn(
                            "flex items-center gap-2 text-sm",
                            rule.valid ? "text-emerald-300" : "text-slate-400"
                          )}
                        >
                          {rule.valid ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          <span>{rule.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {mode === "login" && (
                  <div className="text-right text-sm">
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="text-slate-400 transition hover:text-white"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {error && (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                    {success}
                  </div>
                )}

                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="h-12 w-full rounded-2xl border-0 bg-[linear-gradient(90deg,#22d3ee_0%,#6366f1_55%,#8b5cf6_100%)] text-sm font-bold tracking-wide text-white shadow-[0_18px_40px_rgba(99,102,241,0.35)] transition hover:scale-[1.01] hover:brightness-105"
                >
                  {loading ? "Working..." : modeCopy[mode].cta}
                </Button>
              </div>

              <div className="mt-8 border-t border-slate-800 pt-6 text-center">
                <p className="text-sm text-slate-400">
                  {mode === "signup"
                    ? "Your account is created instantly and protected with a strong password."
                    : mode === "forgot"
                      ? "Reset emails are sent through your Supabase authentication service."
                      : "Account access is protected by Supabase Auth and your own password."}
                </p>

                {!recoveryMode && (
                  <div className="mt-6">
                    <p className="text-sm text-slate-400">
                      {mode === "login"
                        ? "New here?"
                        : mode === "signup"
                          ? "Already registered?"
                          : "Remembered your password?"}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        switchMode(
                          mode === "login"
                            ? "signup"
                            : mode === "signup"
                              ? "login"
                              : "login"
                        )
                      }
                      className="mt-3 text-sm font-semibold tracking-wide text-white transition hover:text-cyan-300"
                    >
                      {mode === "login"
                        ? "CREATE AN ACCOUNT"
                        : mode === "signup"
                          ? "GO TO LOGIN"
                          : "BACK TO LOGIN"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
