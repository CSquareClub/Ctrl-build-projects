import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './context/UserContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';

import Landing    from './pages/Landing';
import Register   from './pages/Register';
import Login      from './pages/Login';
import Dashboard  from './pages/Dashboard';
import Chat       from './pages/Chat';
import StudyTopic from './pages/StudyTopic';
import MockTest   from './pages/MockTest';
import History    from './pages/History';
import Roadmap    from './pages/Roadmap';
import Interview  from './pages/Interview';

// Protected Route — redirects to /login if not authenticated
function Protected({ children }) {
  const { user } = useUser();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Public layout (with Navbar)
function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

function AppRoutes() {
  const { user } = useUser();
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<PublicLayout><Landing /></PublicLayout>} />
      <Route path="/register" element={!user ? <PublicLayout><Register /></PublicLayout> : <Navigate to="/dashboard" replace />} />
      <Route path="/login"    element={!user ? <PublicLayout><Login /></PublicLayout>    : <Navigate to="/dashboard" replace />} />

      {/* Protected (Navbar is inside Dashboard/Chat/etc via Sidebar) */}
      <Route path="/dashboard" element={<Protected><Navbar /><Dashboard /></Protected>} />
      <Route path="/chat"      element={<Protected><Navbar /><Chat /></Protected>} />
      <Route path="/study"     element={<Protected><Navbar /><StudyTopic /></Protected>} />
      <Route path="/quiz"      element={<Protected><Navbar /><MockTest /></Protected>} />
      <Route path="/history"   element={<Protected><Navbar /><History /></Protected>} />
      <Route path="/roadmap"   element={<Protected><Navbar /><Roadmap /></Protected>} />
      <Route path="/interview" element={<Protected><Navbar /><Interview /></Protected>} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </UserProvider>
    </BrowserRouter>
  );
}
