"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, useInView } from "framer-motion";
import {
  CalendarDays, ChevronRight, Cpu, FolderGit2, Mail,
  MessageSquareQuote, Radar, RadioTower, ShieldCheck,
  Sparkles, SquareCode, Workflow, ArrowRight, Zap, Globe, BarChart3,
  Sun, Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { LogoMarquee, IntegrationHub } from "./IntegrationLogos";

/* ───────── data ───────── */
const navItems = [
  { label: "Features", href: "#features" },
  { label: "Integrations", href: "#integrations" },
  { label: "System", href: "#system" },
];

const problemCards = [
  { id: "01", title: "Feedback is scattered", copy: "Support, reviews, inboxes, and telemetry all tell different parts of the same story.", icon: Globe },
  { id: "02", title: "Issues are detected too late", copy: "Teams see the pattern after users already feel the pain and trust has started falling.", icon: Radar },
  { id: "03", title: "Teams react instead of predict", copy: "Manual triage forces product and engineering teams to operate from noise instead of confidence.", icon: Zap },
  { id: "04", title: "No unified intelligence", copy: "Dashboards can display data. They still do not tell you what matters or what to do next.", icon: BarChart3 },
];

const flowSteps = [
  { id: "01", title: "Detect", copy: "Capture inboxes, reviews, frontend SDK signals, forms, and social feedback in one stream.", color: "#dc2626" },
  { id: "02", title: "Analyze", copy: "Classify issues, merge duplicates, detect tone, and separate personal pain from global incidents.", color: "#64748b" },
  { id: "03", title: "Predict", copy: "Model severity, trend acceleration, churn pressure, and future risk before the team gets blindsided.", color: "#dc2626" },
  { id: "04", title: "Decide", copy: "Use confidence, recency, frequency, and user context to rank what deserves action right now.", color: "#64748b" },
  { id: "05", title: "Act", copy: "Create tickets, prepare replies, schedule follow-ups, and draft GitHub actions with safe review gates.", color: "#16a34a" },
];

const features = [
  { id: "01", title: "Unified Feedback Intelligence", copy: "Bring email, SDK, forms, reviews, and social signals into one product intelligence layer.", meta: "Email + SDK + Social", icon: Mail },
  { id: "02", title: "AI Agent Decisions", copy: "Generate confidence-based reasoning and next-step recommendations instead of vague summaries.", meta: "91% Confidence", icon: Sparkles },
  { id: "03", title: "Control Room Dashboard", copy: "Watch issue pressure, system status, and decision flow from one live command surface.", meta: "Real-Time Monitoring", icon: Radar },
  { id: "04", title: "Command Center", copy: "See what the agent is thinking, what it recommends, and what actions it is preparing.", meta: "AI Reasoning + Insights", icon: Cpu },
  { id: "05", title: "Predictive Risk Engine", copy: "Identify churn risk, repeated-user pressure, and issue growth before the team feels the blast radius.", meta: "Trend + Churn Signals", icon: RadioTower },
  { id: "06", title: "GitHub Integration", copy: "Search relevant code, explain root cause, suggest patches, and prepare PR flow with approval.", meta: "Fix Suggestions + PRs", icon: FolderGit2 },
  { id: "07", title: "Automation Engine", copy: "Auto-create tickets, reminders, and email actions without repeating work or spamming users.", meta: "Tickets + Emails", icon: Workflow },
  { id: "08", title: "Google Calendar Sync", copy: "Schedule reviews and follow-ups automatically when the system sees urgency building.", meta: "Scheduling", icon: CalendarDays },
  { id: "09", title: "SDK Integration", copy: "Capture frontend feedback directly inside the product experience and tie it to real issues.", meta: "Frontend Signals", icon: SquareCode },
];

const stats = [
  { value: 128, suffix: "+", label: "Signals Processed" },
  { value: 91, suffix: "%", label: "Confidence Score" },
  { value: 12, suffix: "", label: "Active Decisions" },
  { value: 5, suffix: "min", label: "Avg Response" },
];

const logs = [
  "[12:03:12] Signal detected: onboarding confusion ↑",
  "[12:03:15] Pattern matched: 3 reports",
  "[12:03:18] Risk level: HIGH",
  "[12:03:20] Suggested action generated",
  "[12:03:24] Ticket queued for review",
];

/* ───────── helpers ───────── */
const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

function Reveal({ children, className, delay = 0, id }: { children: React.ReactNode; className?: string; delay?: number; id?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div id={id} className={className} initial={reduced ? false : { opacity: 0, y: 32 }} whileInView={reduced ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.8, ease, delay }}>
      {children}
    </motion.div>
  );
}

function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div className={className} initial={reduced ? false : "hidden"} whileInView={reduced ? undefined : "show"} viewport={{ once: true, amount: 0.1 }} variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}>
      {children}
    </motion.div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div variants={reduced ? undefined : { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } }}>
      {children}
    </motion.div>
  );
}

function AnimatedCounter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const dur = 2000;
    const start = performance.now();
    function tick(now: number) {
      const p = Math.min((now - start) / dur, 1);
      const v = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(v * end));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [inView, end]);
  return <span ref={ref}>{count}{suffix}</span>;
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-9" />;
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

/* ───────── main ───────── */
export default function LandingClient() {
  const [logIndex, setLogIndex] = useState(0);
  const [activeSection, setActiveSection] = useState(navItems[0].href);

  useEffect(() => {
    const t = setInterval(() => setLogIndex(v => (v + 1) % logs.length), 2200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const sectionIds = navItems.map((item) => item.href.replace("#", ""));
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          setActiveSection(`#${visible[0].target.id}`);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.2, 0.35, 0.5, 0.75],
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const visibleLogs = useMemo(() => Array.from({ length: 4 }, (_, i) => logs[(logIndex + i) % logs.length]), [logIndex]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#161616] text-slate-900 dark:text-white overflow-x-hidden transition-colors duration-300" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style jsx global>{`
        @keyframes marquee-scroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
        @keyframes dash-flow { 0%{stroke-dashoffset:20} 100%{stroke-dashoffset:0} }
        @keyframes shimmer { 0%{transform:translateX(-100%) rotate(30deg)} 100%{transform:translateX(100%) rotate(30deg)} }
        @keyframes agentic-pulse { 0%{stroke-dashoffset:620} 100%{stroke-dashoffset:0} }
        @keyframes typing-cursor { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>

      {/* ── navbar ── */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#161616]/80 transition-colors" style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 md:px-6">
          <a href="#top" className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-slate-900 dark:text-white">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />
            AgenticPulse
          </a>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map(n => (
              <a
                key={n.label}
                href={n.href}
                onClick={() => setActiveSection(n.href)}
                className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                  activeSection === n.href
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a href="/login" className="hidden rounded-lg px-4 py-2 text-sm text-slate-500 dark:text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-white md:inline-flex">Login</a>
            <a href="/login" className="relative overflow-hidden rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700">
              Get Started
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 md:px-6">
        {/* ── hero ── */}
        <section id="top" className="grid min-h-[85vh] items-center gap-10 py-20 md:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <div className="relative z-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-transparent px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />
                AI Product Intelligence Runtime
              </div>
              <h1 className="text-[clamp(2.8rem,6vw,5.2rem)] font-bold leading-[0.95] tracking-[-0.04em] text-slate-900 dark:text-white">
                Your Product is{" "}
                <span className="text-red-600 dark:text-red-500">Speaking</span>
                .<br />We Make It{" "}
                <span className="text-emerald-600 dark:text-emerald-400">Heard</span>
                .
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-500 dark:text-slate-400">
                AgenticPulse captures every signal, detects risks early, and acts before users leave. One AI agent watches your entire product surface — so your team never gets blindsided.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="/login" className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-red-600 px-7 py-3.5 text-sm font-semibold text-white transition-all hover:bg-red-700 hover:-translate-y-0.5 shadow-lg shadow-red-600/20">
                  Get Started Free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
                <a href="#system" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-transparent px-7 py-3.5 text-sm font-medium text-slate-700 dark:text-slate-300 transition-all hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md">
                  View Live System <ChevronRight className="h-4 w-4" />
                </a>
              </div>
              <div className="mt-8 grid gap-2.5">
                {["Detect issues before users report", "Auto-create tickets & actions", "AI decisions with confidence scoring"].map(t => (
                  <div key={t} className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">✓</span>
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* HERO RIGHT: Live AgenticPulse Console */}
          <Reveal delay={0.15}>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 shadow-xl shadow-slate-200/50 dark:shadow-black/20 transition-colors">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">AgenticPulse Console</div>
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />
                  Monitoring
                </div>
              </div>
              <div className="mb-4 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#161616] p-4">
                <svg viewBox="0 0 640 150" className="block h-[150px] w-full">
                  <defs>
                    <linearGradient id="pulse-grad" x1="0" y1="0" x2="640" y2="0" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#dc2626" />
                      <stop offset="50%" stopColor="#64748b" />
                      <stop offset="100%" stopColor="#16a34a" />
                    </linearGradient>
                  </defs>
                  <g className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="1">
                    <line x1="0" y1="22" x2="640" y2="22" />
                    <line x1="0" y1="75" x2="640" y2="75" />
                    <line x1="0" y1="128" x2="640" y2="128" />
                  </g>
                  <polyline
                    points="0,88 58,88 96,84 136,88 174,88 214,44 248,116 284,88 326,88 364,82 400,88 438,88 476,52 510,110 544,88 586,88 618,86 640,88"
                    fill="none" stroke="url(#pulse-grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ strokeDasharray: 620, strokeDashoffset: 620, animation: "agentic-pulse 4s linear infinite" }}
                  />
                </svg>
              </div>
              <div className="grid gap-2">
                {[
                  ["Agent Active", "Running", true],
                  ["Monitoring signals", "Live", true],
                  ["Alerts detected", "3 Alerts", false],
                ].map(([label, state, ok]) => (
                  <div key={label as string} className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#161616] px-4 py-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{label as string}</span>
                    <span className={`flex items-center gap-2 text-xs font-medium ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      <span className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`} style={{ animation: ok ? "pulse-dot 2s ease-in-out infinite" : "pulse-dot 1.2s ease-in-out infinite" }} />
                      {state as string}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid min-h-[120px] gap-1.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-900 p-4">
                {visibleLogs.map((line, i) => (
                  <motion.div
                    key={`log-${logIndex}-${line}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, ease, delay: i * 0.04 }}
                    className={`font-mono text-xs tracking-wide ${line.includes("HIGH") ? "text-red-400" : line.includes("Signal") || line.includes("Suggested") || line.includes("Ticket") ? "text-emerald-400" : "text-slate-400"}`}
                  >
                    {line}
                  </motion.div>
                ))}
              </div>
              <div className="mt-3 grid gap-2 grid-cols-4">
                {[
                  ["Signals", "128", true],
                  ["Predictions", "06", false],
                  ["Decisions", "12", false],
                  ["Confidence", "91%", true],
                ].map(([label, value, highlight]) => (
                  <div key={label as string} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#161616] px-3 py-3 text-center">
                    <span className="mb-1 block text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400">{label as string}</span>
                    <span className={`text-lg font-bold tracking-tight ${highlight ? "text-red-600 dark:text-red-400" : "text-slate-700 dark:text-slate-300"}`}>{value as string}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        <LogoMarquee />

        {/* ── stats ── */}
        <Stagger className="grid gap-4 py-16 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(s => (
            <Cell key={s.label}>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                <div className="text-[2.4rem] font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  <AnimatedCounter end={s.value} suffix={s.suffix} />
                </div>
                <div className="mt-1 text-sm text-slate-400 font-medium">{s.label}</div>
              </div>
            </Cell>
          ))}
        </Stagger>

        {/* ── problem ── */}
        <section className="py-20">
          <Reveal>
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Problem Surface</div>
            <h2 className="max-w-3xl text-[clamp(2rem,4vw,3.2rem)] font-bold leading-[1] tracking-tight text-slate-900 dark:text-white">
              Feedback is everywhere. The real issue still gets found <span className="text-red-600 dark:text-red-400">too late</span>.
            </h2>
          </Reveal>
          <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {problemCards.map(c => {
              const Icon = c.icon;
              return (
                <Cell key={c.id}>
                  <article className="group relative h-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                    <div className="mb-3 text-xs font-mono uppercase tracking-[0.12em] text-slate-300 dark:text-slate-600">{c.id}</div>
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 transition-transform duration-300 group-hover:scale-110">
                      <Icon className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <strong className="mb-2 block text-base font-semibold tracking-tight text-slate-900 dark:text-white">{c.title}</strong>
                    <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{c.copy}</p>
                  </article>
                </Cell>
              );
            })}
          </Stagger>
        </section>

        {/* ── solution flow ── */}
        <section className="py-20">
          <Reveal>
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Solution Flow</div>
            <h2 className="max-w-3xl text-[clamp(2rem,4vw,3.2rem)] font-bold leading-[1] tracking-tight text-slate-900 dark:text-white">
              <span className="text-red-600 dark:text-red-400">Detect</span> → Analyze → Predict → Decide → <span className="text-emerald-600 dark:text-emerald-400">Act</span>
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500 dark:text-slate-400">AgenticPulse works like an intelligent operating layer: it watches, reasons, ranks, and prepares action before the team gets blindsided.</p>
          </Reveal>
          <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {flowSteps.map(s => (
              <Cell key={s.id}>
                <article className="group relative h-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="mb-3 text-xs font-mono uppercase tracking-[0.12em] text-slate-300 dark:text-slate-600">{s.id}</div>
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${s.color}10`, border: `1px solid ${s.color}25` }}>
                    <div className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  </div>
                  <strong className="mb-2 block text-base font-semibold tracking-tight text-slate-900 dark:text-white">{s.title}</strong>
                  <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{s.copy}</p>
                </article>
              </Cell>
            ))}
          </Stagger>
        </section>

        {/* ── features ── */}
        <section id="features" className="py-20">
          <Reveal>
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Full Product Coverage</div>
            <h2 className="max-w-3xl text-[clamp(2rem,4vw,3.2rem)] font-bold leading-[1] tracking-tight text-slate-900 dark:text-white">
              Everything the system sees, thinks, and helps your team do.
            </h2>
          </Reveal>
          <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {features.map(f => {
              const Icon = f.icon;
              return (
                <Cell key={f.id}>
                  <article className="group relative h-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                    <div className="mb-3 text-xs font-mono uppercase tracking-[0.12em] text-slate-300 dark:text-slate-600">{f.id}</div>
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-slate-700 transition-transform duration-300 group-hover:scale-110">
                      <Icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <strong className="mb-2 block text-base font-semibold tracking-tight text-slate-900 dark:text-white">{f.title}</strong>
                    <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{f.copy}</p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-50 dark:bg-white/[0.04] px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.1em] text-slate-400 border border-slate-200 dark:border-slate-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {f.meta}
                    </div>
                  </article>
                </Cell>
              );
            })}
          </Stagger>
        </section>

        {/* ── integrations ── */}
        <section id="integrations" className="py-20">
          <Reveal>
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Connections</div>
            <h2 className="max-w-3xl text-[clamp(2rem,4vw,3.2rem)] font-bold leading-[1] tracking-tight text-slate-900 dark:text-white">
              Every signal connected to one <span className="text-emerald-600 dark:text-emerald-400">intelligent core</span>.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500 dark:text-slate-400">Connect the systems where users speak and where your team acts. AgenticPulse turns them into one product brain.</p>
          </Reveal>
          <div className="mt-10 grid gap-5 xl:grid-cols-[1fr_1fr]">
            <Reveal delay={0.04}>
              <IntegrationHub />
            </Reveal>
            <Stagger className="grid gap-4 content-start">
              {[
                { title: "Support and Inbox", copy: "Capture Gmail, support threads, and direct customer messages so feedback never disappears into a queue." },
                { title: "Public Feedback Channels", copy: "Monitor reviews and public complaints to catch issues your internal tools will miss." },
                { title: "Engineering Signals", copy: "Layer in SDK events, API signals, and GitHub context so the system connects what users feel with what the product is doing." },
              ].map((c, i) => (
                <Cell key={c.title}>
                  <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                    <div className="mb-3 text-xs font-mono uppercase tracking-[0.12em] text-slate-300 dark:text-slate-600">Connected Surface 0{i + 1}</div>
                    <strong className="mb-2 block text-base font-semibold tracking-tight text-slate-900 dark:text-white">{c.title}</strong>
                    <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{c.copy}</p>
                  </article>
                </Cell>
              ))}
            </Stagger>
          </div>
        </section>

        {/* ── command center ── */}
        <section id="system" className="py-20">
          <Reveal>
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Command Center</div>
            <h2 className="max-w-3xl text-[clamp(2rem,4vw,3.2rem)] font-bold leading-[1] tracking-tight text-slate-900 dark:text-white">
              Signals. Predictions. Decisions.{" "}
              <span className="text-emerald-600 dark:text-emerald-400">Confidence</span>.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <Reveal delay={0.04}>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 shadow-sm transition-colors">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">AgenticPulse Console</div>
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />
                    Monitoring
                  </div>
                </div>
                <div className="mb-4 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#161616] p-4">
                  <svg viewBox="0 0 640 150" className="block h-[150px] w-full">
                    <defs>
                      <linearGradient id="pulse-grad-2" x1="0" y1="0" x2="640" y2="0" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#dc2626" />
                        <stop offset="50%" stopColor="#64748b" />
                        <stop offset="100%" stopColor="#16a34a" />
                      </linearGradient>
                    </defs>
                    <g className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="1">
                      <line x1="0" y1="22" x2="640" y2="22" />
                      <line x1="0" y1="75" x2="640" y2="75" />
                      <line x1="0" y1="128" x2="640" y2="128" />
                    </g>
                    <polyline
                      points="0,88 58,88 96,84 136,88 174,88 214,44 248,116 284,88 326,88 364,82 400,88 438,88 476,52 510,110 544,88 586,88 618,86 640,88"
                      fill="none" stroke="url(#pulse-grad-2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ strokeDasharray: 620, strokeDashoffset: 620, animation: "agentic-pulse 4s linear infinite" }}
                    />
                  </svg>
                </div>
                <div className="grid gap-2">
                  {[
                    ["Agent Active", "Running", true],
                    ["Monitoring signals", "Live", true],
                    ["Alerts detected", "3 Alerts", false],
                  ].map(([label, state, ok]) => (
                    <div key={label as string} className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#161616] px-4 py-3">
                      <span className="text-sm text-slate-500 dark:text-slate-400">{label as string}</span>
                      <span className={`flex items-center gap-2 text-xs font-medium ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        <span className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`} style={{ animation: ok ? "pulse-dot 2s ease-in-out infinite" : "pulse-dot 1.2s ease-in-out infinite" }} />
                        {state as string}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid min-h-[140px] gap-1.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-900 p-4">
                  {visibleLogs.map((line, i) => (
                    <motion.div
                      key={`log2-${logIndex}-${line}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, ease, delay: i * 0.04 }}
                      className={`font-mono text-xs tracking-wide ${line.includes("HIGH") ? "text-red-400" : line.includes("Signal") || line.includes("Suggested") || line.includes("Ticket") ? "text-emerald-400" : "text-slate-400"}`}
                    >
                      {line}
                    </motion.div>
                  ))}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  {[
                    ["Signals", "128", true],
                    ["Predictions", "06", false],
                    ["Decisions", "12", false],
                    ["Confidence", "91%", true],
                  ].map(([label, value, highlight]) => (
                    <div key={label as string} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#161616] px-4 py-3 text-center">
                      <span className="mb-1 block text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400">{label as string}</span>
                      <span className={`text-xl font-bold tracking-tight ${highlight ? "text-red-600 dark:text-red-400" : "text-slate-700 dark:text-slate-300"}`}>{value as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
            <Stagger className="grid gap-4 content-start">
              {[
                { title: "Signals", copy: "Customer feedback, product events, and source integrations all feed the same reasoning model.", tag: "Unified", ok: true },
                { title: "Predictions", copy: "The system compares trend, severity, recency, and repeated-user pressure to forecast priority.", tag: "Forecasting", ok: false },
                { title: "Decisions", copy: "AgenticPulse prepares action and keeps unsafe automation behind human approval.", tag: "Guarded", ok: true },
              ].map(c => (
                <Cell key={c.title}>
                  <article className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                    <div>
                      <strong className="mb-2 block text-base font-semibold tracking-tight text-slate-900 dark:text-white">{c.title}</strong>
                      <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{c.copy}</p>
                    </div>
                    <div className={`flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-1 text-xs font-medium ${c.ok ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${c.ok ? "bg-emerald-500" : "bg-red-500"}`} style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />
                      {c.tag}
                    </div>
                  </article>
                </Cell>
              ))}
            </Stagger>
          </div>
        </section>

        {/* ── authority ── */}
        <section className="py-20">
          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <Reveal>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-8 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-white/[0.04] px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />
                  Built for teams who don&apos;t guess
                </div>
                <h2 className="max-w-2xl text-[clamp(2rem,4vw,3.2rem)] font-bold leading-[1] tracking-tight text-slate-900 dark:text-white">
                  Built for teams who don&apos;t guess. They{" "}
                  <span className="text-emerald-600 dark:text-emerald-400">know</span>.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500 dark:text-slate-400">
                  AgenticPulse is for product, support, and engineering teams who want one calm system that understands the product better than disconnected dashboards ever could.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-8 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="mb-3 text-xs font-mono uppercase tracking-[0.12em] text-slate-300 dark:text-slate-600">Authority</div>
                <strong className="mb-3 block text-lg font-semibold tracking-tight text-slate-900 dark:text-white">System-first, not template-first</strong>
                <p className="text-sm leading-7 text-slate-500 dark:text-slate-400">
                  Human-in-the-loop controls, contextual actions, product-aware replies, code-aware GitHub reasoning, and predictive scoring built into one interface.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {[
                    { label: "Human Approval", Icon: ShieldCheck },
                    { label: "AI Replies", Icon: MessageSquareQuote },
                    { label: "GitHub Fixes", Icon: FolderGit2 },
                  ].map(({ label, Icon }) => (
                    <span key={label} className="inline-flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <Icon className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-20">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-10 text-center md:p-16">
              <h2 className="relative text-[clamp(2rem,4vw,3.2rem)] font-bold leading-[1] tracking-tight text-slate-900 dark:text-white">
                Stop <span className="text-red-600 dark:text-red-400">reacting</span>. Start{" "}
                <span className="text-emerald-600 dark:text-emerald-400">understanding</span>.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-500 dark:text-slate-400">
                If your product is already speaking through feedback, reviews, and system signals, AgenticPulse is the layer that finally makes it usable.
              </p>
              <div className="relative mt-8 inline-flex">
                <a href="/login" className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-red-600 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-red-700 hover:-translate-y-0.5 shadow-lg shadow-red-600/20">
                  Get Started Free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ── footer ── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent transition-colors">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4 md:px-6">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900 dark:text-white">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              AgenticPulse
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">AI Product Intelligence Runtime. Detect, analyze, predict, decide, and act — all from one system.</p>
          </div>
          {[
            { heading: "Product", links: ["Features", "Integrations", "Command Center", "Pricing"] },
            { heading: "Resources", links: ["Documentation", "API Reference", "Changelog", "Status"] },
            { heading: "Company", links: ["About", "Blog", "Careers", "Contact"] },
          ].map(col => (
            <div key={col.heading}>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{col.heading}</h4>
              <ul className="grid gap-2">
                {col.links.map(link => (
                  <li key={link}><a href="#" className="text-sm text-slate-500 dark:text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-white">{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-200 dark:border-slate-800">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 md:px-6">
            <span className="text-xs text-slate-400">© 2025 AgenticPulse. All rights reserved.</span>
            <span className="text-xs text-slate-400">AI Product Intelligence System</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
