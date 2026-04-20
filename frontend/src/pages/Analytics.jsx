import { useState, useEffect } from 'react';
import { TrendingUp, BarChart as BarChartIcon, Activity, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Analytics() {
  const [stats, setStats] = useState({
    sessions: [],
    totalFocusTimeHrs: 0,
    totalPhoneDistractions: 0
  });

  useEffect(() => {
    fetch('http://localhost:3000/api/analytics')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error("Could not fetch analytics", err));
  }, []);

  const totalSessions = stats.sessions.length;
  const latestSession = totalSessions > 0 ? stats.sessions[stats.sessions.length - 1] : null;
  const latestScore = latestSession ? latestSession.score : '--';
  const latestDistractions = latestSession ? latestSession.distractions : 0;
  const latestTime = latestSession ? latestSession.durationMins.toFixed(1) : 0;

  // For the chart, take up to the last 10 sessions
  const chartSessions = stats.sessions.slice(-10);

  return (
    <div className="flex flex-col gap-6" style={{ height: '100%' }}>
      <header>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Analytics & Progress</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Review your focus metrics, distraction counts, and YOLOv8 historical data.</p>
      </header>

      <div className="flex gap-6">
        <div className="glass-panel" style={{ flex: 1, padding: '24px' }}>
          <div className="flex items-center gap-4">
            <div style={{ padding: '12px', background: 'rgba(108, 99, 255, 0.1)', borderRadius: 'var(--radius-sm)' }}>
              <TrendingUp size={24} color="var(--accent-primary)" />
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Latest Focus Score</p>
              <h2 style={{ fontSize: '2rem' }}>{latestScore}</h2>
            </div>
          </div>
        </div>
        
        <div className="glass-panel" style={{ flex: 1, padding: '24px' }}>
          <div className="flex items-center gap-4">
            <div style={{ padding: '12px', background: 'rgba(234, 67, 53, 0.1)', borderRadius: 'var(--radius-sm)' }}>
              <AlertTriangle size={24} color="var(--accent-danger)" />
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Latest Phone Flags</p>
              <h2 style={{ fontSize: '2rem' }}>{latestDistractions}</h2>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ flex: 1, padding: '24px' }}>
          <div className="flex items-center gap-4">
            <div style={{ padding: '12px', background: 'rgba(67, 233, 123, 0.1)', borderRadius: 'var(--radius-sm)' }}>
              <Activity size={24} color="var(--accent-success)" />
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Latest Tracked Time</p>
              <h2 style={{ fontSize: '2rem' }}>{latestTime}m</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6" style={{ flex: 1, minHeight: '350px' }}>
        <div className="glass-panel" style={{ flex: 2, padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChartIcon size={20} color="var(--accent-primary)" />
            Focus Progression Line Map
          </h3>
          <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
            {chartSessions.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartSessions.map((s, i) => ({ name: `S${i+1}`, score: s.score }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}
                  />
                  <Line type="monotone" dataKey="score" stroke="var(--accent-primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--accent-primary)', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{width:'100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color:'var(--text-secondary)'}}>
                No sessions completed yet. Start a focus session!
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ flex: 1, padding: '24px' }}>
           <h3 style={{ marginBottom: '24px', fontSize: '1.2rem' }}>Recent History Logs</h3>
           <div className="flex flex-col gap-6" style={{ overflowY: 'auto', maxHeight: '250px' }}>
             {stats.sessions.slice().reverse().map((s, i) => (
                <div key={i} style={{ padding: '12px', background: 'rgba(0,0,0,0.03)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{new Date(s.date).toLocaleTimeString()}</span>
                    <span style={{ fontSize: '14px', color: s.reason === 'phone_kill' ? 'var(--accent-danger)' : 'var(--accent-success)'}}>
                      {s.reason.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    Score: <b>{s.score}</b> | Ext: {s.durationMins.toFixed(1)}m | Flags: {s.distractions}
                  </div>
                </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}
