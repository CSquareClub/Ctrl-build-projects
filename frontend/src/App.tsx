import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { RepositoriesPage } from './pages/RepositoriesPage';
import { IssueTriagePage } from './pages/IssueTriagePage';
import { ModerationPage } from './pages/ModerationPage';
import { RecommenderPage } from './pages/RecommenderPage';
import { ReadmeGeneratorPage } from './pages/ReadmeGeneratorPage';
import { SettingsPage } from './pages/SettingsPage';
import { getToken, setToken, clearToken, getMe, apiLogout } from './lib/api';
import type { Page } from './types';

interface AuthUser {
  login: string;
  name: string;
  avatarUrl: string;
}

export default function App() {
  const [page, setPage] = useState<Page>('landing');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // On mount: extract token from URL (OAuth callback) or check localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    const urlError = params.get('auth_error');

    // Clean any query params from URL without reloading
    if (urlToken || urlError) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (urlError) {
      setAuthError('GitHub sign-in was cancelled. Try again whenever you\'re ready.');
      setLoading(false);
      return;
    }

    if (urlToken) {
      setToken(urlToken);
    }

    const token = urlToken || getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    getMe()
      .then((me) => {
        setUser({ login: me.login, name: me.name, avatarUrl: me.avatarUrl });
        setPage('dashboard');
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => setLoading(false));
  }, []);

  const navigate = (p: Page) => setPage(p);

  const logout = async () => {
    await apiLogout().catch(() => {});
    clearToken();
    // Clear any other gitwise-related cached data
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('gitwise_')) localStorage.removeItem(key);
    });
    setUser(null);
    setPage('landing');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || page === 'landing') {
    return <LandingPage authError={authError} onDismissError={() => setAuthError(null)} />;
  }

  return (
    <Layout
      currentPage={page}
      navigate={navigate}
      onLogout={logout}
      user={{ login: user.login, avatarUrl: user.avatarUrl }}
    >
      {page === 'dashboard' && <DashboardPage navigate={navigate} />}
      {page === 'repositories' && <RepositoriesPage />}
      {page === 'triage' && <IssueTriagePage />}
      {page === 'moderation' && <ModerationPage />}
      {page === 'recommender' && <RecommenderPage />}
      {page === 'readme' && <ReadmeGeneratorPage />}
      {page === 'settings' && <SettingsPage onLogout={logout} />}
    </Layout>
  );
}
