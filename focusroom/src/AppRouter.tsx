import { Navigate, Route, Routes } from 'react-router-dom'

import App from './App'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'
import { DashboardPage } from './pages/Dashboard'
import { AiAssistantPage } from './pages/AiAssistant'
import { ArcadeModePage } from './pages/ArcadeMode'
import { FocusRoomsPage } from './pages/FocusRooms'
import { LoginPage } from './pages/Login'
import { NearbyEducatorsPage } from './pages/NearbyEducators'
import { RecordsPage } from './pages/Records'
import { RoomPage } from './pages/Room'
import { AnalyticsLeaderboardPage } from './pages/AnalyticsLeaderboard'
import { StudyPlannerPage } from './pages/StudyPlanner'
import { SignupPage } from './pages/Signup'

function PublicOnlyRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[var(--bg)] text-[var(--text)]">
        <p className="text-sm text-[var(--muted)]">Loading session...</p>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route
        path="/login"
        element={(
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        )}
      />
      <Route
        path="/signup"
        element={(
          <PublicOnlyRoute>
            <SignupPage />
          </PublicOnlyRoute>
        )}
      />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/study-planner" element={<StudyPlannerPage />} />
        <Route path="/smart-room" element={<FocusRoomsPage />} />
        <Route path="/focus-rooms" element={<FocusRoomsPage />} />
        <Route path="/room/:id" element={<RoomPage />} />
        <Route path="/nearby-educators" element={<NearbyEducatorsPage />} />
        <Route
          path="/analytics-leaderboard"
          element={<AnalyticsLeaderboardPage />}
        />
        <Route
          path="/ai-assistant"
          element={<AiAssistantPage />}
        />
        <Route
          path="/arcade-mode"
          element={<ArcadeModePage />}
        />
        <Route path="/records" element={<RecordsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
