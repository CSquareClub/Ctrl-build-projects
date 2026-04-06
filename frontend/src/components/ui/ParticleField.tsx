import { motion } from 'framer-motion'

const particles = Array.from({ length: 26 }).map((_, index) => ({
  id: index,
  x: `${(index * 19) % 100}%`,
  y: `${(index * 33) % 100}%`,
  delay: (index % 7) * 0.35,
  duration: 6 + (index % 5),
}))

export function ParticleField() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute h-1.5 w-1.5 rounded-full blur-[1px]"
          style={{ left: particle.x, top: particle.y, backgroundColor: 'var(--accent)', opacity: 0.55 }}
          animate={{
            opacity: [0.2, 0.85, 0.25],
            y: [0, -22, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Number.POSITIVE_INFINITY,
            delay: particle.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
