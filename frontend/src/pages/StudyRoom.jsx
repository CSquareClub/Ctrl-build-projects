import { useState, useEffect } from 'react';
import { Camera, Smartphone, ScanFace, Activity, ShieldAlert } from 'lucide-react';
import io from 'socket.io-client';

export default function StudyRoom() {
  const [focusScore, setFocusScore] = useState(100);
  const [distractionCount, setDistractionCount] = useState(0);
  const [userMissing, setUserMissing] = useState(false);
  const [phoneDetected, setPhoneDetected] = useState(false);
  const [yoloFeedActive, setYoloFeedActive] = useState(false);

  useEffect(() => {
    const socket = io('http://localhost:3000');

    socket.on('timer_start', () => {
      setFocusScore(100);
      setDistractionCount(0);
      setYoloFeedActive(true);
    });

    socket.on('timer_pause', (data) => {
       if (data.reason === 'phone_detected') {
         setPhoneDetected(true);
         setTimeout(() => setPhoneDetected(false), 3000);
       } else if (data.reason === 'user_missing') {
         setUserMissing(true);
         setTimeout(() => setUserMissing(false), 5000);
       }
    });

    socket.on('focus_update', (data) => {
      setFocusScore(data.score ?? 100);
      setDistractionCount(data.distractionCount ?? 0);
    });

    socket.on('timer_end', (data) => {
      setYoloFeedActive(false);
      setFocusScore(100);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="flex flex-col gap-6" style={{ height: '100%' }}>
      <header className="flex justify-between items-center">
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Active Study Room</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Live YOLOv8 tracking in progress.</p>
        </div>
        <div className="glass-panel" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Focus Score</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: focusScore > 80 ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
              {focusScore}
            </div>
          </div>
          <Activity size={32} color={focusScore > 80 ? 'var(--accent-success)' : 'var(--accent-warning)'} />
        </div>
      </header>

      {(phoneDetected || userMissing) && (
        <div className={`glass-panel alert-pulse flex items-center justify-between`} style={{ padding: '20px', background: 'rgba(234, 67, 53, 0.1)' }}>
          <div className="flex items-center gap-4">
            <ShieldAlert size={32} color="var(--accent-danger)" />
            <div>
              <h3 style={{ color: 'var(--accent-danger)' }}>{phoneDetected ? 'DISTRACTION DETECTED' : 'USER MISSING'}</h3>
              <p style={{ color: '#fff' }}>
                {phoneDetected 
                  ? 'YOLOv8 detected a cell phone (Class 67). Put your phone away to avoid point deductions!'
                  : 'YOLOv8 could not find a person (Class 0). Return to your desk in 10s to keep session active.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-6" style={{ flex: 1 }}>
        {/* Main Feed */}
        <div className="glass-panel flex flex-col" style={{ flex: 2, overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>Webcam Feed (Inference View)</span>
            <span style={{ fontSize: '12px', background: 'var(--accent-primary)', padding: '2px 8px', borderRadius: '12px' }}>LIVE</span>
          </div>
          <div className="flex items-center justify-center" style={{ flex: 1, background: '#000', position: 'relative' }}>
            {yoloFeedActive ? (
              <img src="http://localhost:5000/video_feed" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="YOLOv8 Live Feed" />
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>Feed Disabled</div>
            )}
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="flex flex-col gap-6" style={{ flex: 1 }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ScanFace size={20} color="var(--accent-primary)" />
              YOLOv8 Metrics
            </h3>
            
            <div className="flex justify-between" style={{ marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Tracking Engine</span>
              <span>YOLOv8 Nano</span>
            </div>
            <div className="flex justify-between" style={{ marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Classes Loaded</span>
              <span>[0] Person, [67] Phone</span>
            </div>
            <div className="flex justify-between" style={{ marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Status</span>
              <span style={{ color: 'var(--accent-success)' }}>Inference Active</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Total Distractions</span>
              <span style={{ color: 'var(--accent-danger)', fontWeight: 'bold' }}>{distractionCount}</span>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px', flex: 1 }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Smartphone size={20} color="var(--accent-primary)" />
              Event Log
            </h3>
            
            <div className="flex flex-col gap-3">
              {phoneDetected && (
                <div style={{ fontSize: '14px', background: 'rgba(234, 67, 53, 0.1)', padding: '12px', borderLeft: '3px solid var(--accent-danger)' }}>
                  <span style={{ color: 'var(--text-secondary)', marginRight: '8px' }}>Now</span>
                  Phone strictly prohibited! (-5 pts)
                </div>
              )}
              {userMissing && (
                <div style={{ fontSize: '14px', background: 'rgba(251, 192, 45, 0.1)', padding: '12px', borderLeft: '3px solid var(--accent-warning)' }}>
                  <span style={{ color: 'var(--text-secondary)', marginRight: '8px' }}>Now</span>
                  User missing from the desk.
                </div>
              )}
              <div style={{ fontSize: '14px', background: 'rgba(0, 0, 0, 0.03)', padding: '12px', borderLeft: '3px solid var(--glass-border)' }}>
                <span style={{ color: 'var(--text-secondary)', marginRight: '8px' }}>1m ago</span>
                Session started successfully.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
