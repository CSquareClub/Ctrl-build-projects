import { useNavigate } from 'react-router-dom'
import GridPatternBG from './GridPatternBG'

export default function LandingPage() {
  const navigate = useNavigate()

  // Feature cards data
  const features = [
    {
      icon: '⚡',
      title: 'Lightning Fast',
      desc: 'Generate a professional README in seconds with blazing fast AI.'
    },
    {
      icon: '🎯',
      title: 'High Quality Output',
      desc: 'Get best-practice, developer-friendly docs every time.'
    },
    {
      icon: '🧠',
      title: 'AI Powered',
      desc: 'Harness advanced AI to analyze your repo and write docs.'
    },
    {
      icon: '🎨',
      title: 'Custom Tone',
      desc: 'Choose the style and tone that fits your project.'
    },
  ]

  // Stats
  const stats = [
    { label: '10x Faster', value: '⏱️' },
    { label: 'AI Powered', value: '🤖' },
    { label: '1000+ Devs', value: '👨‍💻' },
    { label: '1-Click Copy', value: '📋' },
  ]

  // How it works steps
  const steps = [
    {
      step: 1,
      text: 'Paste GitHub repo URL',
    },
    {
      step: 2,
      text: 'Select tone',
    },
    {
      step: 3,
      text: 'Generate README instantly',
    },
  ]

  return (
    <div className="min-h-screen bg-[#010314] text-white font-inter relative overflow-x-hidden">
      {/* Layered gradients, glowing blobs, grid, and noise */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* Soft grid pattern */}
        <GridPatternBG />
        {/* Glowing blobs */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-sky opacity-30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple opacity-30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-pink opacity-20 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
        {/* Extra radial gradients */}
        <div className="absolute top-0 right-1/3 w-[300px] h-[300px] bg-gradient-to-br from-sky/30 to-purple/10 rounded-full blur-2xl opacity-40" />
        <div className="absolute bottom-10 left-1/4 w-[220px] h-[220px] bg-gradient-to-tr from-pink/30 to-sky/10 rounded-full blur-2xl opacity-30" />
        {/* Subtle noise overlay */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/noise.png')] opacity-10 mix-blend-soft-light" />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-20 w-full bg-glass/80 backdrop-blur border-b border-slate-800/60 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-extrabold gradient-text tracking-tight select-none drop-shadow-lg">ReadmeAI 🚀</div>
          <button
            className="btn-primary text-base px-6 py-2 shadow-lg hover:scale-105"
            onClick={() => navigate('/app')}
          >
            Try Now
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center py-24 md:py-32">
        {/* Badge */}
        <div className="mb-4 inline-block px-4 py-1 rounded-full bg-gradient-to-r from-sky via-purple to-pink text-xs font-semibold tracking-wide text-white/90 shadow-md backdrop-blur border border-white/10 animate-fade-in">
          🚀 AI Powered • Fast • Developer Friendly
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-6 bg-gradient-to-r from-sky via-purple to-pink bg-clip-text text-transparent drop-shadow-2xl animate-fade-in font-poppins relative">
          <span className="relative z-10">Generate Professional README Files in Seconds</span>
          {/* Glow behind heading */}
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full blur-2xl opacity-40 bg-gradient-to-r from-sky via-purple to-pink -z-10" />
        </h1>
        <p className="text-lg md:text-xl text-[#94A3B8] mb-10 animate-fade-in delay-100">
          AI-powered documentation for developers
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in delay-200">
          <button
            className="btn-primary text-lg px-8 py-3 shadow-xl hover:scale-105"
            onClick={() => navigate('/app')}
          >
            Get Started
          </button>
          <a
            href="#demo"
            className="btn-secondary text-lg px-8 py-3 hover:scale-105"
          >
            View Demo
          </a>
        </div>
      </section>

      {/* Why ReadmeAI Section */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6 gradient-text">Why ReadmeAI?</h2>
        <p className="text-lg text-slate-300 mb-8">Stop wasting time on documentation. Let AI generate beautiful, professional README files for you—instantly, every time.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="card-base p-8 border border-white/10 hover:shadow-glow-blue hover:-translate-y-2 transition-all duration-300">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="font-semibold text-xl mb-2 gradient-text">AI-Powered</h3>
            <p className="text-slate-400">Leverage advanced AI to analyze your code and create tailored documentation.</p>
          </div>
          <div className="card-base p-8 border border-white/10 hover:shadow-glow-purple hover:-translate-y-2 transition-all duration-300">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-semibold text-xl mb-2 gradient-text">Instant Results</h3>
            <p className="text-slate-400">No more manual writing. Get a polished README in seconds, not hours.</p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-8 md:py-12">
        <div className="flex flex-wrap justify-center gap-6 md:gap-12">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center">
              <span className="text-3xl md:text-4xl mb-2 drop-shadow-lg">{s.value}</span>
              <span className="text-base md:text-lg text-slate-300 font-semibold">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16" id="features">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="card-base p-8 flex flex-col items-center text-center bg-white/5 border border-white/10 hover:border-sky/40 hover:shadow-glow-blue rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:scale-105 backdrop-blur-lg group"
            >
              <div className="text-4xl mb-4 drop-shadow-lg group-hover:animate-pulse">{f.icon}</div>
              <h3 className="text-xl font-bold mb-2 gradient-text">{f.title}</h3>
              <p className="text-[#94A3B8] text-base">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-16" id="how-it-works">
        <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center gradient-text">How It Works</h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-8">
          {steps.map((s, i) => (
            <div
              key={s.step}
              className="flex flex-col items-center bg-white/5 border border-white/10 rounded-2xl p-8 shadow-lg hover:shadow-glow-purple transition-all duration-300 hover:-translate-y-1 hover:scale-105 backdrop-blur-lg"
            >
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-sky to-purple text-white text-2xl font-bold mb-4 shadow-lg">
                {s.step}
              </div>
              <div className="text-lg font-semibold mb-2 text-white">{s.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="bg-white/5 rounded-2xl p-12 shadow-2xl border border-sky/30 backdrop-blur-lg">
          <h3 className="text-2xl md:text-3xl font-bold mb-6 gradient-text">Start generating README files now</h3>
          <button
            className="btn-primary text-xl px-10 py-4 shadow-xl hover:scale-105"
            onClick={() => navigate('/app')}
          >
            Try ReadmeAI
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 w-full text-center py-8 text-[#94A3B8] text-base">
        Built for Hackathon 🚀
      </footer>
    </div>
  )
}
