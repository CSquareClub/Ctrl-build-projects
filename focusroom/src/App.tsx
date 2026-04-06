import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

import { FeaturesSection } from './components/sections/FeaturesSection'
import { FinalCtaSection } from './components/sections/FinalCtaSection'
import { Footer } from './components/sections/Footer'
import { HeroSection } from './components/sections/HeroSection'
import { HowItWorksSection } from './components/sections/HowItWorksSection'
import { PreviewSection } from './components/sections/PreviewSection'
import { SocialProofSection } from './components/sections/SocialProofSection'
import { Navbar } from './components/ui/Navbar'
import { ParticleField } from './components/ui/ParticleField'

function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const savedTheme = localStorage.getItem('focusroom-theme')
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('focusroom-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <div id="hero" className="app-shell relative min-h-screen w-full overflow-x-hidden px-6 transition-colors duration-300">
      <Navbar theme={theme} onToggleTheme={toggleTheme} />
      <ParticleField />
      <div className="absolute inset-0 -z-20 mesh-bg" />

      <HeroSection />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <FeaturesSection />
        <HowItWorksSection />
        <PreviewSection />
        <SocialProofSection />
        <FinalCtaSection />
      </motion.main>
      <Footer />
    </div>
  )
}

export default App
