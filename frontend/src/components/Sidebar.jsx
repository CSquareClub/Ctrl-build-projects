import { NavLink } from 'react-router-dom';
import { Target, Settings, BarChart2, Calendar } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Target size={28} color="var(--accent-primary)" />
        <h1>FocusRoom AI</h1>
      </div>

      <nav style={{ flex: 1 }}>
        <NavLink 
          to="/study-room" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Target size={20} />
          <span>Study Room</span>
        </NavLink>

        <NavLink 
          to="/extension" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Settings size={20} />
          <span>Extension</span>
        </NavLink>

        <NavLink 
          to="/analytics" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <BarChart2 size={20} />
          <span>Analytics</span>
        </NavLink>

        <NavLink 
          to="/planner" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Calendar size={20} />
          <span>AI Planner</span>
        </NavLink>
      </nav>

      <div style={{ marginTop: 'auto', padding: '20px', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
        <h4 style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px' }}>YOLOv8 Status</h4>
        <div className="flex items-center gap-2">
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-success)' }}></div>
          <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Vision Active</span>
        </div>
      </div>
    </aside>
  );
}
