import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Landing from './pages/Landing';
import StudyRoom from './pages/StudyRoom';
import ExtensionSettings from './pages/ExtensionSettings';
import Analytics from './pages/Analytics';
import AIPlanner from './pages/AIPlanner';
import './index.css';

function MainLayout() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  if (isLandingPage) {
    return (
      <div className="app-layout" style={{ display: 'block', overflowY: 'auto' }}>
        <Routes>
          <Route path="/" element={<Landing />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/study-room" element={<StudyRoom />} />
          <Route path="/extension" element={<ExtensionSettings />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/planner" element={<AIPlanner />} />
          <Route path="*" element={<Navigate to="/study-room" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <MainLayout />
    </Router>
  );
}

export default App;
