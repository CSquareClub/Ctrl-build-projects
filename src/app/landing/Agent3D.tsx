"use client";

import { motion, useAnimation } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Agent3D Component: Opaque 'Techy' Robot with Internal Signal Throughput
 * 
 * Flow:
 * 1. External Left (Red) -> Enters Left Ear
 * 2. Internal Brain (Red-to-Green Fade) -> Moves Left to Right inside Visor
 * 3. External Right (Green) -> Exits Right Ear
 */

export default function Agent3D() {
  const robotControls = useAnimation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const runPresence = async () => {
      while (true) {
        // Subtle rhythmic scale for bot 'breathing' presence
        await robotControls.start({
          scale: [1, 1.03, 1],
          transition: { duration: 4, ease: "easeInOut" }
        });
      }
    };
    runPresence();
  }, [robotControls]);

  return (
    <div 
      className="relative flex items-center justify-center pointer-events-none p-10" 
      style={{ width: 500, height: 520, perspective: "1500px" }}
    >
      {/* ── Background Aura ── */}
      <div 
        className="absolute rounded-full"
        style={{
          width: 440, height: 440,
          background: "radial-gradient(circle, rgba(34,211,238,0.06), rgba(139,92,246,0.02), transparent 75%)",
          filter: "blur(100px)",
        }}
      />

      {/* ── THE ROBOT (Floating Container) ── */}
      <motion.div
        animate={{ y: [0, -15, 0], rotateY: [-5, 5, -5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 flex flex-col items-center"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* ── Head ── */}
        <div 
          className="relative rounded-[3rem] border-2 border-slate-700/50 bg-slate-950/95 shadow-2xl backdrop-blur-md"
          style={{ width: 170, height: 180, transformStyle: "preserve-3d" }}
        >
          {/* Visor Area (Eyes live here) */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[88%] h-14 bg-black/80 rounded-2xl border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center gap-8 px-4">
            {/* Grid Pattern */}
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(34,211,238,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.05)_1px,transparent_1px)] bg-[size:8px_8px]" />
            
            {/* --- GLOWING EYES (Blinking Animation) --- */}
            <motion.div 
              animate={{ scaleY: [1, 0, 1] }}
              transition={{ duration: 0.15, repeat: Infinity, repeatDelay: 3.5, ease: "easeInOut" }}
              className="w-10 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_20px_#22d3ee,0_0_40px_rgba(34,211,238,0.4)]"
            />
            <motion.div 
              animate={{ scaleY: [1, 0, 1] }}
              transition={{ duration: 0.15, repeat: Infinity, repeatDelay: 3.5, ease: "easeInOut" }}
              className="w-10 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_20px_#22d3ee,0_0_40px_rgba(34,211,238,0.4)]"
            />

            {/* Visor Glare Scanning Effect */}
            <motion.div 
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-y-0 w-8 bg-cyan-400/5 skew-x-[-20deg]" 
            />
          </div>

          {/* Intake / Exhaust Side Ports (Ears) */}
          <div className="absolute -left-5 top-14 w-8 h-20 bg-slate-900 rounded-l-2xl border-l border-y border-slate-700 shadow-xl flex items-center justify-end pr-1 z-20">
             <div className="w-1.5 h-12 bg-black rounded-full border border-slate-800 shadow-[inset_0_0_4px_black]" />
          </div>
          <div className="absolute -right-5 top-14 w-8 h-20 bg-slate-900 rounded-r-2xl border-r border-y border-slate-700 shadow-xl flex items-center pr-1 translate-x-[-1px] z-20">
             <div className="w-1.5 h-12 bg-black rounded-full border border-slate-800 shadow-[inset_0_0_4px_black]" />
             <div className="absolute left-1 w-1.5 h-12 bg-black rounded-full border border-slate-800" />
          </div>

          {/* Antennas / Sensors */}
          <div className="absolute -top-10 left-10 w-1.5 h-12 bg-slate-800 rounded-full origin-bottom rotate-[-15deg] border-t border-white/20" />
          <div className="absolute -top-14 right-10 w-1.5 h-16 bg-slate-800 rounded-full origin-bottom rotate-[10deg] border-t border-white/20">
             <div className="absolute top-0 left-[-2px] w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_15px_#22d3ee]" style={{ animation: "pulse-dot 1.5s infinite" }} />
          </div>
        </div>

        {/* Neck / Linkage */}
        <div className="w-24 h-8 bg-slate-900 border-x-2 border-slate-800 shadow-inner relative flex justify-center">
           <div className="absolute inset-x-2 top-0 h-1 bg-black/60" />
           <div className="w-6 h-full border-x border-white/5" />
        </div>

        {/* Industrial AI Core Torso */}
        <div 
          className="relative bg-slate-950 border-2 border-slate-800 shadow-2xl"
          style={{ 
            width: 300, height: 140, 
            borderRadius: "4rem 4rem 1.75rem 1.75rem",
            transformStyle: "preserve-3d"
          }}
        >
          {/* Internal Glowing Core */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full bg-black border-4 border-slate-900 flex items-center justify-center overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
             <motion.div 
               animate={robotControls}
               className="w-16 h-16 rounded-full flex items-center justify-center z-10"
               style={{ background: "radial-gradient(circle, rgba(34,211,238,0.4), transparent 75%)" }}
             >
                <div className="w-8 h-8 rounded-full bg-cyan-400 shadow-[0_0_30px_#22d3ee]" />
             </motion.div>
             <div className="absolute inset-0 border-[3px] border-dashed border-cyan-400/10 rounded-full" style={{ animation: "orb-spin 10s linear infinite" }} />
          </div>

          {/* Cooling Vents */}
          <div className="absolute top-5 left-12 w-14 h-2 bg-slate-900 rounded-full shadow-inner" />
          <div className="absolute top-5 right-12 w-14 h-2 bg-slate-900 rounded-full shadow-inner" />
        </div>
      </motion.div>

      {/* Floating data particles */}
      {mounted && (
        <div className="absolute inset-0">
          {[...Array(12)].map((_, i) => (
             <motion.div
               key={i}
               animate={{ y: [0, -60, 0], opacity: [0.1, 0.5, 0.1], scale: [1, 1.2, 1] }}
               transition={{ duration: 4 + Math.random() * 5, repeat: Infinity, delay: i * 0.6 }}
               className="absolute w-1 h-1 bg-cyan-400 rounded-full"
               style={{ left: `${15 + Math.random() * 70}%`, top: `${25 + Math.random() * 50}%` }}
             />
          ))}
        </div>
      )}
    </div>
  );
}
