import { Lock, Sparkles, Calendar as CalendarIcon, Clock } from 'lucide-react';

export default function AIPlanner() {
  return (
    <div className="flex flex-col gap-6" style={{ height: '100%', position: 'relative' }}>
      <header>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Gen-AI Schedule Planner</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Automate your deep work blocks with intelligent predictive modeling.</p>
      </header>

      {/* Blurred out content */}
      <div className="flex gap-6 premium-locked" style={{ flex: 1 }}>
        <div className="glass-panel flex flex-col gap-4" style={{ flex: 1, padding: '24px' }}>
          <div className="flex items-center justify-between" style={{ padding: '16px', background: 'rgba(0,0,0,0.03)', borderRadius: '8px' }}>
            <div className="flex items-center gap-3">
              <CalendarIcon color="var(--text-secondary)" />
              <span style={{ color: 'var(--text-primary)' }}>Generate Roadmap for "Machine Learning Midterm"</span>
            </div>
            <Sparkles color="var(--accent-primary)" size={20} />
          </div>
          <div className="flex items-center justify-between" style={{ padding: '16px', background: 'rgba(0,0,0,0.03)', borderRadius: '8px' }}>
            <div className="flex items-center gap-3">
              <Clock color="var(--text-secondary)" />
              <span style={{ color: 'var(--text-primary)' }}>Optimal Pomodoro Configuration: 50m / 10m</span>
            </div>
            <Sparkles color="var(--accent-primary)" size={20} />
          </div>
        </div>
      </div>

      {/* Premium overlay content */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 20,
        textAlign: 'center',
        background: 'var(--bg-surface)',
        padding: '40px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--accent-primary)',
        boxShadow: '0 20px 40px rgba(37, 99, 235, 0.1)',
        maxWidth: '480px',
        width: '100%'
      }}>
        <div style={{ 
          width: '64px', height: '64px', 
          background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)', 
          borderRadius: '50%', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px auto',
          boxShadow: '0 4px 20px var(--accent-primary-glow)'
        }}>
          <Lock size={32} color="#fff" />
        </div>
        
        <h2 style={{ fontSize: '1.8rem', marginBottom: '12px', color: 'var(--text-primary)' }}>
          FocusRoom Pro Required
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: '1.6' }}>
          Unlock the AI Planner to automatically generate hyper-optimized deep work schedules based on your YOLOv8 distraction data and past flow sessions.
        </p>
        
        <button className="btn-primary w-full" style={{ padding: '16px', fontSize: '1.1rem' }}>
          Upgrade to Pro
        </button>
      </div>

    </div>
  );
}
