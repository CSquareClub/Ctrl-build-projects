import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, BarChart2, Settings, Calendar as CalendarIcon, Brain, ArrowRight, Zap, ChevronDown, ShieldCheck, ChevronRight } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  const scrollToGrid = () => {
    document.getElementById('command-center').scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'radial-gradient(circle at top right, rgba(37, 99, 235, 0.08), transparent 600px), linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)',
    }}>
      {/* Header */}
      <header className="flex justify-between items-center" style={{ padding: '24px 64px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <div className="flex items-center gap-2">
          <div style={{ background: 'var(--accent-primary)', color: 'white', padding: '8px', borderRadius: '8px' }}>
            <Brain size={24} />
          </div>
          <h1 style={{ fontSize: '1.5rem', letterSpacing: '-0.02em', margin: 0 }}>FocusRoom <b>AI</b></h1>
        </div>
        <nav className="flex gap-6 items-center">
          <a href="#" style={{ color: 'var(--text-secondary)', fontWeight: 500 }} onClick={(e) => { e.preventDefault(); scrollToGrid(); }}>Features</a>
          <button className="btn-secondary" onClick={() => navigate('/study-room')}>
            Enter Dashboard
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <section style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px 0 24px', textAlign: 'center', position: 'relative' }}>
        <div style={{ maxWidth: '800px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }} className="animate-fade-up">
          <div style={{ display: 'inline-flex', alignItems: 'center', margin: '0 auto', gap: '8px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent-primary)', padding: '6px 16px', borderRadius: '100px', fontWeight: 600, fontSize: '14px', marginBottom: '24px' }}>
            <Zap size={16} fill="currentColor" />
            Empowered by YOLOv8 Vision
          </div>
          <h1 style={{ fontSize: '4.5rem', lineHeight: 1.1, marginBottom: '24px', color: '#111827' }}>
            Reclaim Your <span style={{ color: 'var(--accent-primary)' }}>Focus.</span><br />Master Your Time.
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px auto' }}>
            An intelligent, elegantly designed web dashboard and Chrome Extension that tracks your deep work, mathematically curates your progress, and brutally blocks your phone distractions in real-time.
          </p>
          <div className="flex justify-center gap-4">
            <button className="btn-primary flex items-center gap-2" style={{ fontSize: '1.1rem', padding: '16px 32px' }} onClick={scrollToGrid}>
              Get Started <ChevronRight size={20} />
            </button>
            <button className="btn-secondary flex items-center gap-2" style={{ fontSize: '1.1rem', padding: '16px 32px' }}>
              <ShieldCheck size={20} />
              Install Extension
            </button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div style={{ paddingBottom: '40px', opacity: 0.5, cursor: 'pointer' }} onClick={scrollToGrid} className="animate-float">
            <span style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Explore the Hub</span>
            <ChevronDown size={24} style={{ margin: '0 auto' }} />
        </div>
      </section>

      {/* Main Dashboard Grid Area */}
      <section id="command-center" style={{ padding: '100px 64px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '3rem', color: '#111827', marginBottom: '8px' }}>Command Center</h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Select a module below to initialize your deep work environment.</p>
        </div>

        {/* The Hub Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>
          
          {/* Card 1: Study Room */}
          <div 
            onClick={() => navigate('/study-room')}
            style={{ padding: '32px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '24px', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div className="flex items-center justify-between mb-4">
              <div style={{ padding: '16px', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '12px', color: 'var(--accent-primary)' }}>
                <Target size={32} />
              </div>
              <ArrowRight color="var(--text-muted)" />
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Study Room</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Enter the main tracking environment. Turn on your YOLOv8 camera feed and let the AI monitor your deep work and enforce discipline.
            </p>
          </div>

          {/* Card 2: Analytics */}
          <div 
            onClick={() => navigate('/analytics')}
            style={{ padding: '32px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '24px', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div className="flex items-center justify-between mb-4">
              <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', color: 'var(--accent-success)' }}>
                <BarChart2 size={32} />
              </div>
              <ArrowRight color="var(--text-muted)" />
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Live Analytics</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Review mathematically calculated focus scores, monitor real-time distraction trends, and analyze your historical session data.
            </p>
          </div>

          {/* Card 3: Extension Settings */}
          <div 
            onClick={() => navigate('/extension')}
            style={{ padding: '32px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '24px', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div className="flex items-center justify-between mb-4">
              <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', color: 'var(--accent-danger)' }}>
                <Settings size={32} />
              </div>
              <ArrowRight color="var(--text-muted)" />
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Extension Rules</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Configure strict distraction blocking, strict limits on maximum browser tabs, and manage declarativeNetRequest overrides.
            </p>
          </div>

          {/* Card 4: AI Planner */}
          <div 
            onClick={() => navigate('/planner')}
            style={{ padding: '32px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '24px', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div className="flex items-center justify-between mb-4">
              <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', color: 'var(--accent-warning)' }}>
                <CalendarIcon size={32} />
              </div>
              <ArrowRight color="var(--text-muted)" />
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Gen-AI Planner (Pro)</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Automate your timetable with intelligent generative modeling. Let FocusRoom mathematically divide your blocks dynamically.
            </p>
          </div>

        </div>
      </section>
    </div>
  );
}
