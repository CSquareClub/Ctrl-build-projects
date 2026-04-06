import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import UserProfile from '../components/UserProfile';
import StatsCard from '../components/StatsCard';
import ActivitiesCard from '../components/ActivitiesCard';
import PullRequestsCard from '../components/PullRequestsCard';
import IssuesCard from '../components/IssuesCard';
import { Star, GitFork, Eye, CircleDot, Search, X } from 'lucide-react';

export default function Home() {
  const [repoInput, setRepoInput] = useState('');
  const [repoData, setRepoData] = useState(null);
  const [repoOwner, setRepoOwner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [commitsData, setCommitsData] = useState([]);
  const [pullRequestsData, setPullRequestsData] = useState([]);
  const [issuesData, setIssuesData] = useState([]);
  const [commitsError, setCommitsError] = useState(null);
  const [prsError, setPrsError] = useState(null);
  const [issuesError, setIssuesError] = useState(null);
  const [extrasLoading, setExtrasLoading] = useState(false);

  const searchInputRef = useRef(null);

  // Parse repo link to extract owner and repo name
  const parseRepoLink = (input) => {
    if (input.includes('github.com/')) {
      const parts = input.split('github.com/')[1].split('/');
      return { owner: parts[0], repo: parts[1] };
    }
    const parts = input.split('/');
    if (parts.length === 2) {
      return { owner: parts[0], repo: parts[1] };
    }
    return null;
  };

  // Convert ISO timestamp to relative time
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

  const fetchRepoData = async (input) => {
    setLoading(true);
    setError(null);
    try {
      const parsed = parseRepoLink(input);
      if (!parsed) throw new Error('Invalid format. Use "owner/repo" or full GitHub URL');

      const { owner, repo } = parsed;

      const [repoRes, ownerRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}`),
        fetch(`https://api.github.com/users/${owner}`),
      ]);

      if (!repoRes.ok) {
        const errJson = await repoRes.json().catch(() => ({}));
        const msg = errJson.message || `HTTP ${repoRes.status}`;
        throw new Error(msg.toLowerCase().includes('rate limit')
          ? 'GitHub API rate limit exceeded. Please wait a few minutes and try again.'
          : `Repository not found: ${msg}`);
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

  const parseApiError = async (res) => {
    try {
      const json = await res.json();
      if (json.message) {
        if (json.message.toLowerCase().includes('rate limit')) return 'GitHub API rate limit exceeded. Try again later.';
        return json.message;
      }
    } catch {}
    return `Request failed (HTTP ${res.status})`;
  };

  const fetchRepoExtras = async (owner, repo) => {
    setExtrasLoading(true);
    setCommitsError(null);
    setPrsError(null);
    setIssuesError(null);

    const [commitsRes, prsRes, issuesRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=25`),
      fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=30`),
      fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=50`),
    ]);

    // Commits
    if (commitsRes.ok) {
      const commitsJson = await commitsRes.json();
      setCommitsData(
        commitsJson.map((c) => ({
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

    // Pull Requests
    if (prsRes.ok) {
      const prsJson = await prsRes.json();
      setPullRequestsData(
        prsJson.map((pr) => ({
          id: pr.id,
          title: pr.title,
          state: pr.state,
          number: pr.number,
          createdAt: timeAgo(pr.created_at),
        }))
      );
    } else {
      setPullRequestsData([]);
      setPrsError(await parseApiError(prsRes));
    }

    // Issues (exclude PRs — GitHub API returns PRs in /issues too)
    if (issuesRes.ok) {
      const issuesJson = await issuesRes.json();
      setIssuesData(
        issuesJson
          .filter((issue) => !issue.pull_request)
          .map((issue) => ({
            id: issue.id,
            number: issue.number,
            title: issue.title,
            state: issue.state,
            createdAt: timeAgo(issue.created_at),
          }))
      );
    } else {
      setIssuesData([]);
      setIssuesError(await parseApiError(issuesRes));
    }

    setExtrasLoading(false);
  };

  useEffect(() => {
    if (repoInput) fetchRepoData(repoInput);
  }, []);

  // Focus input when search bar opens
  useEffect(() => {
    if (showSearchBar && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearchBar]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchValue.trim()) {
      setRepoInput(searchValue.trim());
      fetchRepoData(searchValue.trim());
      setShowSearchBar(false);
      setSearchValue('');
    }
  };

  const handleSearchButtonClick = () => {
    setShowSearchBar((prev) => !prev);
    if (showSearchBar) setSearchValue('');
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowSearchBar(false);
      setSearchValue('');
    }
  };

  return (
    <>
      <Head>
        <title>Synapse — GitHub Repo Viewer</title>
        <meta name="description" content="View GitHub repository information and statistics" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Navbar />

      {/* Floating Search Overlay */}
      {showSearchBar && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={handleOverlayClick}
        >
          <div className="w-full max-w-xl mx-4">
            <form
              onSubmit={handleSearch}
              className="bg-[#161b22] border border-github-border rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center px-4 py-3 gap-3">
                <Search size={16} className="text-github-muted flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search repository  (owner/repo or full URL)"
                  className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-github-muted"
                />
                <button
                  type="button"
                  onClick={() => { setShowSearchBar(false); setSearchValue(''); }}
                  className="text-github-muted hover:text-white transition flex-shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="border-t border-github-border px-4 py-2.5 flex items-center justify-between">
                <span className="text-github-muted text-xs">Press Enter to search</span>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-1.5 rounded-md font-medium transition"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search Icon Button — top right */}
      <button
        onClick={handleSearchButtonClick}
        className="fixed top-4 right-4 z-40 bg-[#161b22] hover:bg-github-border border border-github-border text-github-text hover:text-white p-2.5 rounded-lg transition shadow-lg"
        title="Search repository"
      >
        <Search size={18} />
      </button>

      <main className="ml-64 bg-github-bg h-screen overflow-hidden flex flex-col p-8">
        <div className="flex flex-col flex-1 min-h-0 max-w-7xl w-full">
          {error && (
            <div className="bg-red-900 bg-opacity-20 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4 text-sm flex-shrink-0">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center flex-1">
              <div className="text-center">
                <div className="animate-spin border-4 border-github-border border-t-blue-500 rounded-full w-10 h-10 mx-auto mb-4" />
                <p className="text-github-muted text-sm">Loading repository...</p>
              </div>
            </div>
          )}

          {!loading && repoOwner && repoData && (
            <>
              {/* Owner Profile */}
              <div className="flex-shrink-0">
                <UserProfile user={repoOwner} />
              </div>

              {/* Repo name + description */}
              <div className="mb-4 flex-shrink-0">
                <h2 className="text-lg font-bold text-white">{repoData.full_name}</h2>
                {repoData.description && (
                  <p className="text-github-muted text-sm mt-1">{repoData.description}</p>
                )}
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-4 gap-4 mb-4 flex-shrink-0">
                <StatsCard title="Stars" count={repoData.stargazers_count} icon={Star} iconColor="text-yellow-400" />
                <StatsCard title="Forks" count={repoData.forks_count} icon={GitFork} iconColor="text-blue-400" />
                <StatsCard title="Watchers" count={repoData.watchers_count} icon={Eye} iconColor="text-green-400" />
                <StatsCard title="Open Issues" count={repoData.open_issues_count} icon={CircleDot} iconColor="text-orange-400" />
              </div>

              {/* Content Row: Commits | PRs | Issues — fills remaining height */}
              <div className="grid grid-cols-3 gap-5 flex-1 min-h-0 overflow-hidden">
                <ActivitiesCard commits={commitsData} error={commitsError} loading={extrasLoading} />
                <PullRequestsCard pullRequests={pullRequestsData} error={prsError} loading={extrasLoading} />
                <IssuesCard issues={issuesData} error={issuesError} loading={extrasLoading} />
              </div>
            </>
          )}

          {!loading && !repoOwner && !error && (
            <div className="flex items-center justify-center flex-1">
              <div className="text-center">
                <Search size={32} className="text-github-muted mx-auto mb-3" />
                <p className="text-github-muted text-sm">
                  Click the search button to find a repository
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
