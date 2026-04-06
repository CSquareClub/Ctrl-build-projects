import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { Page } from '../types';

const PAGE_TITLES: Record<Page, string> = {
  landing: 'Home',
  dashboard: 'Dashboard',
  repositories: 'Repositories',
  triage: 'Issue Triage',
  moderation: 'Moderation',
  recommender: 'First Issue Recommender',
  readme: 'README Generator',
  settings: 'Settings',
};

interface LayoutProps {
  currentPage: Page;
  navigate: (page: Page) => void;
  onLogout: () => void;
  user: { login: string; avatarUrl: string };
  children: React.ReactNode;
}

export function Layout({ currentPage, navigate, onLogout, user, children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-200 overflow-hidden">
      <Sidebar currentPage={currentPage} navigate={navigate} />
      <div className="flex flex-col flex-1 min-w-0">
        <Header user={user} onLogout={onLogout} title={PAGE_TITLES[currentPage]} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
