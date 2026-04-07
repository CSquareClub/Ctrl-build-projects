import { motion } from 'framer-motion'
import {
  BellRing,
  BrainCircuit,
  ChartColumn,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Trophy,
  Users,
} from 'lucide-react'

import { FeatureCard } from '../ui/FeatureCard'
import { Section } from '../ui/Section'

const features = [
  {
    title: 'Smart Focus Timer',
    description: 'Adaptive Pomodoro cycles that adjust to your real focus patterns.',
    icon: Clock3,
  },
  {
    title: 'Virtual Study Rooms',
    description: 'Join live rooms and build momentum with focused peers.',
    icon: Users,
  },
  {
    title: 'Productivity Analytics',
    description: 'Track deep work, consistency, and distraction patterns.',
    icon: ChartColumn,
  },
  {
    title: 'Leaderboard & Streaks',
    description: 'Stay motivated with rankings and daily streak tracking.',
    icon: Trophy,
  },
  {
    title: 'Focus Reminders',
    description: 'Smart nudges that bring you back before distractions win.',
    icon: BellRing,
  },
  {
    title: 'AI Focus Coach',
    description: 'Personalized insights when your productivity drops.',
    icon: BrainCircuit,
  },
  {
    title: 'Room Chat',
    description: 'Minimal chat for quick support without breaking flow.',
    icon: MessageCircle,
  },
  {
    title: 'Daily Goals',
    description: 'Set clear targets and end each day with measurable wins.',
    icon: CheckCircle2,
  },
]

export function FeaturesSection() {
  return (
    <Section
      id="features"
      eyebrow="Everything You Need"
      title="Flashcard Features Built for Real Focus"
      description="Purposeful tools that remove friction, increase accountability, and make productive study sessions easy to sustain."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
            >
              <FeatureCard
                icon={Icon}
                title={feature.title}
                description={feature.description}
              />
            </motion.div>
          )
        })}
      </div>
    </Section>
  )
}
