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
  ArrowRight,
  Zap,
  BarChart3,
  Bot,
  Sun,
  Moon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
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
    helper: "Set up Agentic Pulse in minutes and start turning scattered feedback into product intelligence.",
  },
  forgot: {
    title: "Reset your password",
    cta: "Send reset link",
    helper: "We'll email you a secure reset link so you can get back into your workspace.",
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

const trustMetrics = [
  { icon: Zap, value: "10k+", label: "Signals processed" },
  { icon: BarChart3, value: "91%", label: "Confidence score" },
  { icon: Bot, value: "Real-time", label: "Issue detection" },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-9" />;
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-transparent text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export default function LoginPage() {
  const {
    signInWithGoogle,
    signInWithGitHub,
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

  const handleGitHubSignIn = async () => {
    resetMessages();
    setLoading(true);

    try {
      await signInWithGitHub("/dashboard");
    } catch (err) {
      setError(toUserFacingError(err, "auth-github"));
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-white dark:bg-[#161616]">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent px-6 py-4 text-sm text-slate-500 dark:text-slate-400 shadow-lg">
          Checking your session...
        </div>
      </div>
    );
  }

  const showPasswordFields = mode === "login" || mode === "signup" || mode === "reset";
  const showPasswordStrength = mode === "signup" || mode === "reset";

  return (
    <div className="min-h-screen bg-white dark:bg-[#161616] text-slate-900 dark:text-white transition-colors duration-300">
      <div className="relative flex min-h-screen">
        {/* ─── Left Panel: Brand & Features ─── */}
        <div className="relative hidden min-h-screen flex-1 overflow-hidden border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent px-12 py-10 lg:flex lg:basis-[58%] lg:flex-col transition-colors">

          <div className="relative z-10 flex h-full flex-col">
            {/* Logo */}
            <div className="flex items-center justify-between">
              <a href="/" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">Agentic Pulse</p>
                  <p className="text-xs text-slate-400">AI Product Intelligence</p>
                </div>
              </a>
              <ThemeToggle />
            </div>

            {/* Hero Copy */}
            <div className="mt-16 max-w-2xl">
              <div className="mb-6 flex flex-wrap gap-3">
                <span className="rounded-full border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">
                  No setup required
                </span>
                <span className="rounded-full border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-red-700 dark:text-red-400">
                  Works instantly
                </span>
                <span className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-transparent px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Lightweight workflows
                </span>
              </div>

              <h1 className="max-w-xl text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 dark:text-white xl:text-5xl">
                Turn scattered feedback into{" "}
                <span className="text-red-600 dark:text-red-400">product</span>{" "}
                <span className="text-emerald-600 dark:text-emerald-400">intelligence</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-500 dark:text-slate-400">
                Agentic Pulse unifies emails, reviews, and user signals into actionable insights — so your team always knows what matters.
              </p>

              {/* Trust Metrics */}
              <div className="mt-8 flex flex-wrap items-center gap-8">
                {trustMetrics.map(m => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-transparent border border-slate-200 dark:border-slate-700 shadow-sm">
                        <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{m.value}</p>
                        <p className="text-xs text-slate-400">{m.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Feature Cards */}
            <div className="relative z-10 mt-10 grid max-w-3xl flex-1 grid-cols-2 gap-3 xl:mt-12">
              {featureCards.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-transparent border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{feature.title}</h3>
                    <p className="mt-1.5 text-xs leading-5 text-slate-400">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── Right Panel: Auth Form ─── */}
        <div className="relative flex min-h-screen flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:basis-[42%]">

          <div className="relative z-10 w-full max-w-md">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/20 transition-colors">
              <div className="mb-8">
                {/* Mobile-only logo + toggle */}
                <div className="mb-5 flex items-center justify-between lg:hidden">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Agentic Pulse</p>
                      <p className="text-xs text-slate-400">AI Product Intelligence</p>
                    </div>
                  </div>
                  <ThemeToggle />
                </div>

                {/* Mode Tabs */}
                {!recoveryMode && (
                  <div className="mb-6 grid grid-cols-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#161616] p-1 text-xs sm:text-sm">
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className={cn(
                        "rounded-lg px-3 py-2 font-semibold transition-all",
                        mode === "login"
                          ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                          : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      )}
                    >
                      Login
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode("signup")}
                      className={cn(
                        "rounded-lg px-3 py-2 font-semibold transition-all",
                        mode === "signup"
                          ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                          : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      )}
                    >
                      Sign Up
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className={cn(
                        "rounded-lg px-3 py-2 font-semibold transition-all",
                        mode === "forgot"
                          ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                          : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      )}
                    >
                      Reset
                    </button>
                  </div>
                )}

                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600 dark:text-red-400">
                  Secure workspace access
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {modeCopy[mode].title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {modeCopy[mode].helper}
                </p>
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  No credit card required
                </p>
              </div>

              <div className="space-y-4">
                {(mode === "login" || mode === "signup") && (
                  <>
                    <Button
                      type="button"
                      onClick={handleGitHubSignIn}
                      disabled={loading}
                      variant="outline"
                      className="h-12 w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-transparent text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-md"
                    >
                      <span className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                        GH
                      </span>
                      Continue with GitHub
                    </Button>

                    <Button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      variant="outline"
                      className="h-12 w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-transparent text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-md"
                    >
                      <span className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300">
                        G
                      </span>
                      Continue with Google
                    </Button>

                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-slate-200 dark:bg-transparent" />
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                        Or continue with email
                      </span>
                      <div className="h-px flex-1 bg-slate-200 dark:bg-transparent" />
                    </div>
                  </>
                )}

                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full name</label>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-transparent px-4 py-3 transition focus-within:border-red-300 dark:focus-within:border-red-500/40 focus-within:shadow-[0_0_0_3px_rgba(220,38,38,0.08)]">
                      <User className="h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Type your full name"
                        className="w-full border-0 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {mode !== "reset" && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-transparent px-4 py-3 transition focus-within:border-red-300 dark:focus-within:border-red-500/40 focus-within:shadow-[0_0_0_3px_rgba(220,38,38,0.08)]">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Type your email"
                        className="w-full border-0 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {showPasswordFields && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-transparent px-4 py-3 transition focus-within:border-red-300 dark:focus-within:border-red-500/40 focus-within:shadow-[0_0_0_3px_rgba(220,38,38,0.08)]">
                      <Lock className="h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={
                          mode === "login" ? "Type your password" : "Create a strong password"
                        }
                        className="w-full border-0 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {(mode === "signup" || mode === "reset") && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirm password</label>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-transparent px-4 py-3 transition focus-within:border-red-300 dark:focus-within:border-red-500/40 focus-within:shadow-[0_0_0_3px_rgba(220,38,38,0.08)]">
                      <ShieldCheck className="h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Retype your password"
                        className="w-full border-0 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {showPasswordStrength && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-transparent p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Password requirements
                    </p>
                    <div className="space-y-2">
                      {passwordRules.map((rule) => (
                        <div
                          key={rule.label}
                          className={cn(
                            "flex items-center gap-2 text-sm",
                            rule.valid ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
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
                      className="text-slate-400 transition hover:text-red-600 dark:hover:text-red-400"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
                    {success}
                  </div>
                )}

                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="h-12 w-full rounded-xl border-0 bg-red-600 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 hover:shadow-xl hover:shadow-red-600/30"
                >
                  {loading ? "Working..." : modeCopy[mode].cta}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </div>

              <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-5 text-center">
                <p className="text-xs text-slate-400">
                  {mode === "signup"
                    ? "Your account is created instantly and protected with a strong password."
                    : mode === "forgot"
                      ? "Reset emails are sent through your Supabase authentication service."
                      : "Account access is protected by Supabase Auth and your own password."}
                </p>

                {!recoveryMode && (
                  <div className="mt-4">
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
                      className="mt-2 text-sm font-semibold text-red-600 dark:text-red-400 transition hover:text-red-700 dark:hover:text-red-300"
                    >
                      {mode === "login"
                        ? "Create an account →"
                        : mode === "signup"
                          ? "Go to login →"
                          : "Back to login →"}
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
