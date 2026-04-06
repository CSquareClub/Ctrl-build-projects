import { useState, useEffect } from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import UserProfile from '../components/UserProfile';
import StatsCard from '../components/StatsCard';
import ActivitiesCard from '../components/ActivitiesCard';
import PullRequestsCard from '../components/PullRequestsCard';
import IssuesCard from '../components/IssuesCard';
import SearchModal from '../components/SearchModal';
import { buildIssueListUrl, mapIssueListPayloadToCardIssues } from '../lib/issueListContract';
import { Star, GitFork, Eye, CircleDot, Search } from 'lucide-react';

export default function Home() {
  const [repoData, setRepoData] = useState(null);
  const [repoOwner, setRepoOwner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [commitsData, setCommitsData] = useState([]);
  const [pullRequestsData, setPullRequestsData] = useState([]);
  const [issuesData, setIssuesData] = useState([]);
  const [commitsError, setCommitsError] = useState(null);
  const [prsError, setPrsError] = useState(null);
  const [issuesError, setIssuesError] = useState(null);
  const [extrasLoading, setExtrasLoading] = useState(false);

  // Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const parseRepoLink = (input) => {
    if (input.includes('github.com/')) {
      const parts = input.split('github.com/')[1].split('/');
      return { owner: parts[0], repo: parts[1] };
    }
    const parts = input.split('/');
    if (parts.length === 2) return { owner: parts[0], repo: parts[1] };
    return null;
  };

  const timeAgo = (iso) => {
    try {
      const delta = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
      if (delta < 60) return `${delta}s ago`;
      if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
      if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
      return `${Math.floor(delta / 86400)}d ago`;
    } catch {
      return iso;
    }
  };

  const authHeaders = () => {
    const token = localStorage.getItem('gh_token') || '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const parseApiError = async (res) => {
    try {
      const json = await res.json();
      if (json.message) {
        if (json.message.toLowerCase().includes('rate limit'))
          return 'GitHub API rate limit exceeded. Add a token in the sidebar to get 5,000 req/hr.';
        return json.message;
      }
    } catch {}
    return `Request failed (HTTP ${res.status})`;
  };

  const fetchRepoData = async (input) => {
    setLoading(true);
    setError(null);
    setRepoData(null);
    setRepoOwner(null);
    // clear stale data immediately so old repo's data doesn't linger
    setCommitsData([]);
    setPullRequestsData([]);
    setIssuesData([]);
    setCommitsError(null);
    setPrsError(null);
    setIssuesError(null);
    try {
      const parsed = parseRepoLink(input);
      if (!parsed) throw new Error('Invalid format. Use "owner/repo" or full GitHub URL');

      const { owner, repo } = parsed;
      const headers = authHeaders();

      const [repoRes, ownerRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
        fetch(`https://api.github.com/users/${owner}`, { headers }),
      ]);

      if (!repoRes.ok) {
        const errJson = await repoRes.json().catch(() => ({}));
        const msg = errJson.message || `HTTP ${repoRes.status}`;
        throw new Error(
          msg.toLowerCase().includes('rate limit')
            ? 'GitHub API rate limit exceeded. Add a token in the sidebar to get 5,000 req/hr.'
            : `Repository not found: ${msg}`
        );
      }
      if (!ownerRes.ok) {
        const errJson = await ownerRes.json().catch(() => ({}));
        throw new Error(errJson.message || 'Owner not found');
      }

      const [repoJson, ownerJson] = await Promise.all([repoRes.json(), ownerRes.json()]);
      setRepoData(repoJson);
      setRepoOwner(ownerJson);

      await fetchRepoExtras(owner, repo);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRepoExtras = async (owner, repo) => {
    setExtrasLoading(true);
    setCommitsError(null);
    setPrsError(null);
    setIssuesError(null);

    const headers = authHeaders();
    const backendIssuesUrl = buildIssueListUrl(process.env.NEXT_PUBLIC_API_BASE_URL, owner, repo);

    const [
      commitsRes,
      prsOpenRes,
      prsClosedRes,
      backendIssuesRes,
    ] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=30`, { headers }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=50`, { headers }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=closed&per_page=50`, { headers }),
      fetch(backendIssuesUrl, { headers }),
    ]);

    // Commits
    if (commitsRes.ok) {
      const json = await commitsRes.json();
      setCommitsData(
        json.map((c) => ({
          sha: c.sha.slice(0, 7),
          message: c.commit.message.split('\n')[0],
          author: c.commit.author?.name || 'Unknown',
          timestamp: timeAgo(c.commit.author?.date),
        }))
      );
    } else {
      setCommitsData([]);
      setCommitsError(await parseApiError(commitsRes));
    }

    // Pull Requests — merge open + closed
    const prsOk = prsOpenRes.ok || prsClosedRes.ok;
    if (prsOk) {
      const openPRs   = prsOpenRes.ok   ? await prsOpenRes.json()   : [];
      const closedPRs = prsClosedRes.ok ? await prsClosedRes.json() : [];
      setPullRequestsData(
        [...openPRs, ...closedPRs].map((pr) => ({
          id: pr.id,
          title: pr.title,
          state: pr.state,
          number: pr.number,
          createdAt: timeAgo(pr.created_at),
        }))
      );
      if (!prsOpenRes.ok)   setPrsError(await parseApiError(prsOpenRes));
      if (!prsClosedRes.ok) setPrsError(await parseApiError(prsClosedRes));
    } else {
      setPullRequestsData([]);
      setPrsError(await parseApiError(prsOpenRes));
    }

    if (backendIssuesRes.ok) {
      const issueListPayload = await backendIssuesRes.json();
      setIssuesData(mapIssueListPayloadToCardIssues(issueListPayload, timeAgo));
    } else {
      // Fetch open + closed separately (per_page=100 is GitHub API max)
      // so both tabs have data and PR filtering doesn't drain the list
      const [fallbackOpenRes, fallbackClosedRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100`, { headers }),
        fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=closed&per_page=100`, { headers }),
      ]);

      const openJson   = fallbackOpenRes.ok   ? await fallbackOpenRes.json()   : [];
      const closedJson = fallbackClosedRes.ok ? await fallbackClosedRes.json() : [];
      const combined   = [...openJson, ...closedJson];

      if (combined.length > 0) {
        setIssuesData(mapIssueListPayloadToCardIssues(combined, timeAgo));
      } else {
        setIssuesData([]);
        setIssuesError(await parseApiError(backendIssuesRes));
      }
    }

    setExtrasLoading(false);
  };

  return (
    <>
      <Head>
        <title>Synapse — GitHub Repo Viewer</title>
        <meta name="description" content="View GitHub repository information and statistics" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Navbar onTokenChange={() => {}} />

      <SearchModal
        open={showSearch}
        onClose={() => setShowSearch(false)}
        onSearch={(query) => fetchRepoData(query)}
      />

      {/* Search button — top right */}
      <button
        onClick={() => setShowSearch(true)}
        className="fixed top-4 right-4 z-40 bg-terminal-surface border border-terminal-border text-terminal-muted hover:border-terminal-text hover:text-terminal-bright p-2.5 rounded transition font-mono"
        title="Search repository (Ctrl+K)"
      >
        <Search size={16} />
      </button>

      <main className="ml-64 bg-terminal-bg h-screen overflow-hidden flex flex-col p-6">
        <div className="flex flex-col flex-1 min-h-0 max-w-7xl w-full">

          {error && (
            <div className="border border-terminal-red text-terminal-red px-4 py-2.5 rounded mb-4 text-xs flex-shrink-0 font-mono">
              <span className="text-terminal-muted mr-2">error:</span>{error}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center flex-1">
              <div className="text-center font-mono">
                <div className="text-terminal-bright text-sm mb-2 cursor-blink">fetching repository</div>
                <div className="text-terminal-muted text-xs">please wait...</div>
              </div>
            </div>
          )}

          {!loading && repoOwner && repoData && (
            <>
              <div className="flex-shrink-0">
                <UserProfile user={repoOwner} />
              </div>

              <div className="mb-3 flex-shrink-0 font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-terminal-muted text-xs">repo</span>
                  <span className="text-terminal-bright text-sm font-bold glow">{repoData.full_name}</span>
                </div>
                {repoData.description && (
                  <p className="text-terminal-muted text-xs mt-0.5 italic">// {repoData.description}</p>
                )}
              </div>

              <div className="grid grid-cols-4 gap-3 mb-4 flex-shrink-0">
                <StatsCard title="stars"       count={repoData.stargazers_count} icon={Star}      />
                <StatsCard title="forks"       count={repoData.forks_count}      icon={GitFork}   />
                <StatsCard title="watchers"    count={repoData.watchers_count}   icon={Eye}       />
                <StatsCard title="open_issues" count={repoData.open_issues_count} icon={CircleDot} />
              </div>

              <div className="grid grid-cols-3 gap-4 flex-1 min-h-0 overflow-hidden">
                <ActivitiesCard commits={commitsData} error={commitsError} loading={extrasLoading} />
                <PullRequestsCard pullRequests={pullRequestsData} error={prsError} loading={extrasLoading} />
                <IssuesCard issues={issuesData} error={issuesError} loading={extrasLoading} />
              </div>
            </>
          )}

          {!loading && !repoOwner && !error && (
            <div className="flex items-center justify-center flex-1">
              <div className="text-center font-mono">
                <div className="text-terminal-bright text-lg mb-2 cursor-blink glow">synapse</div>
                <div className="text-terminal-muted text-xs mb-4">github repository viewer</div>
                <div className="text-terminal-text text-xs border border-terminal-border rounded px-4 py-2.5 inline-block">
                  press <span className="text-terminal-bright">Ctrl+K</span> to search a repository
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
