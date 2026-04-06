import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
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

  // Animations
  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: 'easeOut' }
  }

  const staggerContainer = {
    animate: {
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  }

  const floatingAnimation = {
    animate: {
      y: [0, -10, 0],
      transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
    }
  }

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
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <motion.div 
            className="text-3xl font-extrabold gradient-text tracking-tight select-none drop-shadow-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            ReadmeAI 🚀
          </motion.div>
          <motion.button
            className="btn-primary text-base px-7 py-2.5 shadow-lg hover:scale-105 transition-all duration-300"
            onClick={() => navigate('/app')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Try Now
          </motion.button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center py-32 md:py-48 px-6">
        {/* Badge */}
        <motion.div 
          className="mb-8 inline-block px-5 py-2 rounded-full bg-gradient-to-r from-sky via-purple to-pink text-xs font-semibold tracking-widest text-white/90 shadow-lg backdrop-blur border border-white/20"
          {...fadeInUp}
          whileHover={{ scale: 1.05 }}
        >
          ✨ AI Powered • Lightning Fast • Enterprise Ready
        </motion.div>

        {/* Main Heading */}
        <motion.div
          {...fadeInUp}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-black mb-8 bg-gradient-to-r from-sky via-purple to-pink bg-clip-text text-transparent drop-shadow-2xl font-poppins leading-tight relative z-10">
            Generate Professional README Files in Seconds
          </h1>
          {/* Enhanced glow behind heading */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full blur-3xl opacity-50 bg-gradient-to-r from-sky via-purple to-pink -z-10 rounded-full" />
        </motion.div>

        {/* Subheading */}
        <motion.p 
          className="text-xl md:text-2xl text-slate-300 mb-12 max-w-3xl leading-relaxed font-light"
          {...fadeInUp}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          AI-powered documentation that explains your project better than you can. 
          <span className="block mt-2 text-lg text-slate-400">No writing. No hassle. Pure automation.</span>
        </motion.p>

        {/* CTA Button */}
        <motion.div
          {...fadeInUp}
          transition={{ duration: 0.8, delay: 0.3 }}
          whileHover={{ scale: 1.05 }}
        >
          <button
            className="btn-primary text-xl md:text-2xl px-12 md:px-16 py-4 md:py-5 shadow-2xl hover:shadow-glow-blue transition-all duration-300 font-bold tracking-wide rounded-full"
            onClick={() => navigate('/app')}
          >
            Get Started Free →
          </button>
        </motion.div>

        {/* Floating elements */}
        <motion.div
          className="mt-16 text-sm text-slate-400"
          {...fadeInUp}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          No credit card required • 30 free READMEs
        </motion.div>
      </section>

      {/* Why ReadmeAI Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20 md:py-32 text-center">
        <motion.h2 
          className="text-4xl md:text-5xl font-bold mb-6 gradient-text"
          {...fadeInUp}
        >
          Why ReadmeAI?
        </motion.h2>
        <motion.p 
          className="text-xl text-slate-300 mb-16 max-w-3xl mx-auto leading-relaxed"
          {...fadeInUp}
          transition={{ delay: 0.1 }}
        >
          Stop wasting time on documentation. Let AI generate beautiful, professional README files for you—instantly, every time.
        </motion.p>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div 
            className="card-base p-10 border border-white/10 hover:shadow-glow-blue hover:-translate-y-3 transition-all duration-300 group"
            variants={fadeInUp}
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-5xl mb-4 drop-shadow-lg group-hover:scale-110 transition-transform">🤖</div>
            <h3 className="font-bold text-2xl mb-3 gradient-text">AI-Powered</h3>
            <p className="text-slate-400 text-lg">Leverage advanced AI to analyze your code and create tailored documentation.</p>
          </motion.div>
          
          <motion.div 
            className="card-base p-10 border border-white/10 hover:shadow-glow-purple hover:-translate-y-3 transition-all duration-300 group"
            variants={fadeInUp}
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-5xl mb-4 drop-shadow-lg group-hover:scale-110 transition-transform">⚡</div>
            <h3 className="font-bold text-2xl mb-3 gradient-text">Instant Results</h3>
            <p className="text-slate-400 text-lg">No more manual writing. Get a polished README in seconds, not hours.</p>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16 md:py-24">
        <motion.div 
          className="flex flex-wrap justify-center gap-8 md:gap-16"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {stats.map((s) => (
            <motion.div 
              key={s.label} 
              className="flex flex-col items-center group"
              variants={fadeInUp}
              whileHover={{ scale: 1.1 }}
            >
              <span className="text-4xl md:text-5xl mb-3 drop-shadow-lg group-hover:scale-125 transition-transform duration-300">{s.value}</span>
              <span className="text-lg md:text-xl text-slate-300 font-semibold">{s.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28" id="features">
        <motion.h2
          className="text-4xl md:text-5xl font-bold mb-16 text-center gradient-text"
          {...fadeInUp}
        >
          Powerful Features
        </motion.h2>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="card-base p-8 flex flex-col items-center text-center bg-white/5 border border-white/10 hover:border-sky/40 hover:shadow-glow-blue rounded-2xl transition-all duration-300 hover:-translate-y-3 hover:scale-105 backdrop-blur-lg group"
              variants={fadeInUp}
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-5xl mb-4 drop-shadow-lg group-hover:animate-bounce">{f.icon}</div>
              <h3 className="text-xl font-bold mb-3 gradient-text">{f.title}</h3>
              <p className="text-slate-400 text-base leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20 md:py-28" id="how-it-works">
        <motion.h2 
          className="text-4xl md:text-5xl font-bold mb-16 text-center gradient-text"
          {...fadeInUp}
        >
          How It Works
        </motion.h2>
        
        <motion.div 
          className="flex flex-col md:flex-row items-center justify-center gap-8"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              className="flex flex-col items-center bg-white/5 border border-white/10 rounded-2xl p-10 shadow-lg hover:shadow-glow-purple transition-all duration-300 hover:-translate-y-2 hover:scale-105 backdrop-blur-lg flex-1"
              variants={fadeInUp}
              whileHover={{ scale: 1.05 }}
            >
              <motion.div 
                className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-sky to-purple text-white text-3xl font-bold mb-5 shadow-lg"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                {s.step}
              </motion.div>
              <div className="text-lg font-semibold text-white text-center">{s.text}</div>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute left-full text-3xl text-slate-500 mx-4">→</div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-20 md:py-28 text-center">
        <motion.div 
          className="bg-gradient-to-br from-sky/10 via-purple/10 to-pink/10 rounded-3xl p-12 md:p-16 shadow-2xl border border-sky/30 backdrop-blur-lg"
          {...fadeInUp}
          whileHover={{ scale: 1.02 }}
        >
          <h3 className="text-3xl md:text-4xl font-bold mb-8 gradient-text leading-tight">
            Ready to Transform Your Documentation?
          </h3>
          <p className="text-lg text-slate-300 mb-10">Join 1000+ developers already generating stunning READMEs with AI</p>
          <motion.button
            className="btn-primary text-xl px-14 py-5 shadow-2xl font-bold tracking-wide rounded-full"
            onClick={() => navigate('/app')}
            whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(6, 182, 212, 0.6)' }}
            whileTap={{ scale: 0.95 }}
          >
            Start Creating Now →
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 w-full text-center py-12 text-slate-400 text-base border-t border-slate-800/50">
        <p className="mb-2">🚀 Built for the Global Hackathon</p>
        <p className="text-sm text-slate-500">© 2026 ReadmeAI. All rights reserved.</p>
      </footer>
    </div>
  )
}
