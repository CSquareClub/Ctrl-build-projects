import {
  Zap,
  Shield,
  Compass,
  FileText,
  Tag,
  ArrowRight,
  CheckCircle,
  Star,
  GitPullRequest,
  X,
} from 'lucide-react';
import { GithubIcon } from '../components/GithubIcon';
import { loginUrl } from '../lib/api';

const handleLogin = () => {
  window.location.href = loginUrl();
};

const FEATURES = [
  {
    icon: Tag,
    title: 'Issue Intelligence',
    description:
      'Every new issue is automatically classified, scored for priority, checked for duplicates, and labelled — no human needed.',
    accent: 'from-violet-500 to-fuchsia-500',
    tag: 'Triage Engine',
    tagColor: 'bg-violet-500/10 text-violet-400',
  },
  {
    icon: Shield,
    title: 'AI Code Moderation',
    description:
      'GitWise AI scans PR diffs, commits, and comments for security issues, hardcoded secrets, policy violations, and toxic content before anything merges.',
    accent: 'from-red-500 to-orange-500',
    tag: 'Real-time Guard',
    tagColor: 'bg-red-500/10 text-red-400',
  },
  {
    icon: Compass,
    title: 'First Issue Recommender',
    description:
      'New contributors get personalised issue recommendations ranked by skill match, difficulty, and freshness. Never stare at a backlog again.',
    accent: 'from-emerald-500 to-teal-500',
    tag: 'Match Engine',
    tagColor: 'bg-emerald-500/10 text-emerald-400',
  },
  {
    icon: FileText,
    title: 'README Generator',
    description:
      'Point GitWise AI at any repo and it produces a complete, professional README draft — title, install steps, API reference, contributing guide, and license.',
    accent: 'from-amber-500 to-yellow-500',
    tag: 'Doc AI',
    tagColor: 'bg-amber-500/10 text-amber-400',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Connect GitHub via OAuth',
    description:
      'One click to authorise GitWise AI. Select which repositories to monitor — public or private.',
  },
  {
    step: '02',
    title: 'Webhooks register automatically',
    description:
      'For each selected repo, the backend registers a GitHub Webhook and does a full backfill of existing open issues and PRs.',
  },
  {
    step: '03',
    title: 'AI works in the background',
    description:
      'Every event — new issue, PR opened, commit pushed, comment posted — is processed by Qwen2.5 72B asynchronously. Results appear in the dashboard instantly.',
  },
];

const STATS = [
  { value: '72B', label: 'Parameter open-source model' },
  { value: '0¢', label: 'Per-token cost — ever' },
  { value: '5s', label: 'Avg. triage time per issue' },
  { value: '4', label: 'Core problems solved in one platform' },
];

interface LandingPageProps {
  authError?: string | null;
  onDismissError?: () => void;
}

export function LandingPage({ authError, onDismissError }: LandingPageProps = {}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      {/* Auth error banner */}
      {authError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-zinc-900 border border-amber-500/30 text-amber-300 text-sm px-4 py-3 rounded-2xl shadow-2xl shadow-black/60 max-w-sm w-full mx-4">
          <span className="flex-1">{authError}</span>
          <button onClick={onDismissError} className="text-amber-500 hover:text-amber-300 transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* Navbar */}
      <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white tracking-tight text-lg">GitWise AI</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-500 hidden sm:block">Powered by Qwen2.5 72B · Free to run</span>
            <button
              onClick={handleLogin}
              className="flex items-center gap-2 bg-white text-zinc-900 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-zinc-100 transition-colors"
            >
              <GithubIcon className="w-4 h-4" />
              Connect GitHub
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium px-4 py-1.5 rounded-full mb-8">
          <Star className="w-3 h-3" />
          Open source · Self-hostable · Zero paid APIs
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tighter text-white mb-6 leading-none">
          Your AI-powered
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            GitHub companion
          </span>
        </h1>

        <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          GitWise AI triages noisy issues, catches faulty PRs before they merge, helps newcomers find their first contribution,
          and writes your README — all powered by{' '}
          <code className="text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded text-sm">Qwen2.5 72B</code>. No paid APIs. Ever.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleLogin}
            className="flex items-center gap-3 bg-white text-zinc-900 font-bold text-base px-8 py-4 rounded-2xl hover:bg-zinc-100 transition-all hover:scale-105 shadow-xl shadow-white/10 w-full sm:w-auto justify-center"
          >
            <GithubIcon className="w-5 h-5" />
            Connect GitHub — it's free
            <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href="#features"
            className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
          >
            See all features ↓
          </a>
        </div>

        {/* Status indicator */}
        <div className="mt-12 inline-flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          AI inference live — connect GitHub to start monitoring your repositories.
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-zinc-800 bg-zinc-900/30">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-zinc-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white tracking-tight mb-3">
            Everything your open-source project needs
          </h2>
          <p className="text-zinc-400">From noisy issues to bad PRs — GitWise AI handles it in one platform.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 hover:border-zinc-600 transition-all group"
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.accent} p-0.5 flex-shrink-0`}
                >
                  <div className="w-full h-full bg-zinc-900 rounded-[14px] flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 ${feature.tagColor}`}>
                    {feature.tag}
                  </span>
                  <h3 className="text-lg font-bold text-white">{feature.title}</h3>
                </div>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Block notification example */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
          <div className="px-8 py-6 border-b border-zinc-800">
            <h2 className="text-xl font-bold text-white mb-1">
              AI block notifications — posted directly on GitHub
            </h2>
            <p className="text-sm text-zinc-400">
              When a PR is blocked, contributors see exactly why — with a link to the faulty line of code.
            </p>
          </div>
          <div className="p-8 grid md:grid-cols-2 gap-8">
            {/* Blocked PR card */}
            <div className="bg-zinc-950 border border-red-900/40 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <GitPullRequest className="w-4 h-4 text-red-400" />
                <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">PR Blocked</span>
              </div>
              <div className="text-sm text-zinc-200 font-mono leading-relaxed space-y-2">
                <p className="text-red-400 font-bold">🚫 GitWise AI — Pull Request Blocked</p>
                <p className="text-zinc-400">This pull request was automatically stopped because:</p>
                <p><span className="text-zinc-500">Reason:</span> Hardcoded API key detected in source file.</p>
                <p className="text-violet-400 underline cursor-pointer">
                  → View: src/config/database.js#L42
                </p>
                <p className="text-zinc-500 text-xs mt-4">— GitWise AI (Qwen2.5 72B)</p>
              </div>
            </div>

            {/* Checks */}
            <div className="space-y-3">
              {[
                'Code diff scanned for secrets and vulnerabilities',
                'Commit messages checked for quality standards',
                'PR description verified against issue reference policy',
                'Target branch validated against repo rules',
                'Toxic language detection on all comments',
                'Duplicate issue check on every new submission',
              ].map((check) => (
                <div key={check} className="flex items-center gap-3 text-sm text-zinc-300">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  {check}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-12 text-center">
          Up and running in 3 steps
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.step} className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/20 flex items-center justify-center mx-auto mb-5">
                <span className="text-violet-400 font-mono font-bold text-sm">{step.step}</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="bg-gradient-to-br from-violet-600/20 to-fuchsia-600/10 border border-violet-500/20 rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">
            Ready to stop babysitting GitHub?
          </h2>
          <p className="text-zinc-400 mb-8 max-w-md mx-auto">
            Connect your repositories and let GitWise AI take over the noise — free, forever.
          </p>
          <button
            onClick={handleLogin}
            className="inline-flex items-center gap-3 bg-white text-zinc-900 font-bold text-base px-8 py-4 rounded-2xl hover:bg-zinc-100 transition-all hover:scale-105 shadow-xl shadow-white/5"
          >
            <GithubIcon className="w-5 h-5" />
            Get started with GitHub
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-violet-600 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            GitWise AI — MIT License
          </div>
          <div className="flex items-center gap-6">
            <span>Qwen2.5 72B</span>
            <span>FastAPI · Supabase · FAISS</span>
            <span>React · Tailwind CSS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
