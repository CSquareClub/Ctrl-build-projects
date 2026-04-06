import { useState, useEffect } from 'react';
import Head from 'next/head';
import { AlertCircle, CircleDot, GitFork, Search, Star } from 'lucide-react';
import Navbar from '../components/Navbar';
import UserProfile from '../components/UserProfile';
import StatsCard from '../components/StatsCard';
import SearchModal from '../components/SearchModal';
import RepoIssuesCard from '../components/RepoIssuesCard';
import TriageSummaryCard from '../components/TriageSummaryCard';
import DuplicateCandidatesCard from '../components/DuplicateCandidatesCard';
import { buildIssueListUrl, mapIssueListPayloadToCardIssues } from '../lib/issueListContract';
import { buildAnalyzeCandidates, buildSimilarCandidates, extractSimilarCandidates, mapTriageResult } from '../lib/triageContract';
import { getAuthHeaders, parseApiError, parseRepoInput, timeAgo } from '../lib/repoHelpers';

function mergeHeaders(baseHeaders, requestHeaders = {}) {
  return { ...baseHeaders, ...requestHeaders };
}

async function tryEndpointCandidates(candidates, headers) {
  let unavailableCount = 0;
  let lastError = null;

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate.url, {
        ...candidate.options,
        headers: mergeHeaders(headers, candidate.options?.headers),
      });

      if (res.ok) {
        const payload = await res.json();
        return { ok: true, payload, unavailable: false, error: null };
      }

      const message = await parseApiError(res);
      lastError = message;

      if ([404, 405, 501].includes(res.status)) {
        unavailableCount += 1;
        continue;
      }

      return { ok: false, payload: null, unavailable: false, error: message };
    } catch (err) {
      return {
        ok: false,
        payload: null,
        unavailable: false,
        error: err?.message || 'Network request failed',
      };
    }
  }

  return {
    ok: false,
    payload: null,
    unavailable: unavailableCount === candidates.length,
    error: lastError || 'Endpoint unavailable',
  };
}

export default function RepoAnalysisPage() {
  const [repoData, setRepoData] = useState(null);
  const [repoOwner, setRepoOwner] = useState(null);
  const [repoRef, setRepoRef] = useState(null);
  const [issues, setIssues] = useState([]);

  const [loadingRepo, setLoadingRepo] = useState(false);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [triageLoading, setTriageLoading] = useState(false);
  const [duplicatesLoading, setDuplicatesLoading] = useState(false);

  const [error, setError] = useState(null);
  const [issuesError, setIssuesError] = useState(null);
  const [triageError, setTriageError] = useState(null);
  const [duplicatesError, setDuplicatesError] = useState(null);

  const [triageUnavailable, setTriageUnavailable] = useState(false);
  const [duplicatesUnavailable, setDuplicatesUnavailable] = useState(false);

  const [selectedIssue, setSelectedIssue] = useState(null);
  const [triageResult, setTriageResult] = useState(null);
  const [duplicateCandidates, setDuplicateCandidates] = useState([]);

  const [showSearch, setShowSearch] = useState(false);

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

  const fetchIssueTriage = async (owner, repo, issue) => {
    if (!issue) return;

    setSelectedIssue(issue);
    setTriageLoading(true);
    setDuplicatesLoading(true);
    setTriageError(null);
    setDuplicatesError(null);
    setTriageUnavailable(false);
    setDuplicatesUnavailable(false);
    setTriageResult(null);
    setDuplicateCandidates([]);

    const headers = getAuthHeaders();

    const [analyzeResult, similarResult] = await Promise.all([
      tryEndpointCandidates(
        buildAnalyzeCandidates(process.env.NEXT_PUBLIC_API_BASE_URL, owner, repo, issue.number),
        headers
      ),
      tryEndpointCandidates(
        buildSimilarCandidates(process.env.NEXT_PUBLIC_API_BASE_URL, owner, repo, issue.number),
        headers
      ),
    ]);

    if (analyzeResult.ok) {
      setTriageResult(mapTriageResult(analyzeResult.payload, issue.number));
    } else {
      setTriageError(analyzeResult.error);
      setTriageUnavailable(analyzeResult.unavailable);
    }

    if (similarResult.ok) {
      setDuplicateCandidates(extractSimilarCandidates(similarResult.payload));
    } else {
      setDuplicatesError(similarResult.error);
      setDuplicatesUnavailable(similarResult.unavailable);
    }

    setTriageLoading(false);
    setDuplicatesLoading(false);
  };

  const fetchRepoData = async (input) => {
    setLoadingRepo(true);
    setIssuesLoading(true);

    setError(null);
    setIssuesError(null);
    setTriageError(null);
    setDuplicatesError(null);

    setRepoData(null);
    setRepoOwner(null);
    setRepoRef(null);

    setIssues([]);
    setSelectedIssue(null);
    setTriageResult(null);
    setDuplicateCandidates([]);
    setTriageUnavailable(false);
    setDuplicatesUnavailable(false);

    try {
      const parsed = parseRepoInput(input);
      if (!parsed) throw new Error('Invalid format. Use "owner/repo" or full GitHub URL');

      const { owner, repo } = parsed;
      const headers = getAuthHeaders();

      const [repoRes, ownerRes, issuesRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
        fetch(`https://api.github.com/users/${owner}`, { headers }),
        fetch(buildIssueListUrl(process.env.NEXT_PUBLIC_API_BASE_URL, owner, repo), { headers }),
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
        throw new Error(errJson.message || 'Repository owner could not be loaded');
      }

      if (!issuesRes.ok) {
        throw new Error(await parseApiError(issuesRes));
      }

      const [repoJson, ownerJson, issueListPayload] = await Promise.all([
        repoRes.json(),
        ownerRes.json(),
        issuesRes.json(),
      ]);

      const mappedIssues = mapIssueListPayloadToCardIssues(issueListPayload, timeAgo);

      setRepoData(repoJson);
      setRepoOwner(ownerJson);
      setRepoRef({ owner, repo });
      setIssues(mappedIssues);

      if (mappedIssues.length > 0) {
        await fetchIssueTriage(owner, repo, mappedIssues[0]);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load repository data');
      setIssuesLoading(false);
      setLoadingRepo(false);
      return;
    }

    setIssuesLoading(false);
    setLoadingRepo(false);
  };

  const handleIssueSelection = async (issue) => {
    if (!repoRef) return;
    await fetchIssueTriage(repoRef.owner, repoRef.repo, issue);
  };

  return (
    <>
      <Head>
        <title>OpenIssue — Repository Analysis</title>
        <meta
          name="description"
          content="Analyze GitHub repository issues for duplicate reports, vague bugs, and missing labels."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Navbar onTokenChange={() => {}} />

      <SearchModal
        open={showSearch}
        onClose={() => setShowSearch(false)}
        onSearch={(query) => fetchRepoData(query)}
      />

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
              <span className="text-terminal-muted mr-2">error:</span>
              {error}
            </div>
          )}

          {loadingRepo && (
            <div className="flex items-center justify-center flex-1">
              <div className="text-center font-mono">
                <div className="text-terminal-bright text-sm mb-2 cursor-blink">loading repository analysis</div>
                <div className="text-terminal-muted text-xs">building issue triage context...</div>
              </div>
            </div>
          )}

          {!loadingRepo && repoOwner && repoData && (
            <>
              <div className="flex-shrink-0">
                <UserProfile user={repoOwner} />
              </div>

              <div className="mb-3 flex-shrink-0 font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-terminal-muted text-xs">analysis_target</span>
                  <span className="text-terminal-bright text-sm font-bold glow">{repoData.full_name}</span>
                </div>
                <p className="text-terminal-muted text-xs mt-0.5 italic">
                  {'// duplicate reports, vague bugs, and missing labels slow down development'}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-4 flex-shrink-0">
                <StatsCard title="stars" count={repoData.stargazers_count} icon={Star} />
                <StatsCard title="forks" count={repoData.forks_count} icon={GitFork} />
                <StatsCard title="open_issues" count={repoData.open_issues_count} icon={CircleDot} />
                <StatsCard title="analysis_scope" count={issues.length} icon={AlertCircle} />
              </div>

              <div className="grid grid-cols-3 gap-4 flex-1 min-h-0 overflow-hidden">
                <RepoIssuesCard
                  issues={issues}
                  error={issuesError}
                  loading={issuesLoading}
                  selectedIssueNumber={selectedIssue?.number}
                  onSelectIssue={handleIssueSelection}
                />
                <TriageSummaryCard
                  issue={selectedIssue}
                  loading={triageLoading}
                  error={triageError}
                  unavailable={triageUnavailable}
                  triage={triageResult}
                />
                <DuplicateCandidatesCard
                  issue={selectedIssue}
                  loading={duplicatesLoading}
                  error={duplicatesError}
                  unavailable={duplicatesUnavailable}
                  duplicates={duplicateCandidates}
                />
              </div>
            </>
          )}

          {!loadingRepo && !repoOwner && !error && (
            <div className="flex items-center justify-center flex-1">
              <div className="text-center font-mono max-w-md">
                <div className="text-terminal-bright text-lg mb-2 cursor-blink glow">openissue/repo-analysis</div>
                <div className="text-terminal-muted text-xs mb-4">
                  backend-driven triage for duplicate reports, vague bugs, and missing labels
                </div>
                <div className="text-terminal-text text-xs border border-terminal-border rounded px-4 py-2.5 inline-block">
                  press <span className="text-terminal-bright">Ctrl+K</span> to analyze a repository
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
