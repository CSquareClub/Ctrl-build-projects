import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import UserProfile from '../components/UserProfile';
import StatsCard from '../components/StatsCard';
import ActivitiesCard from '../components/ActivitiesCard';
import PullRequestsCard from '../components/PullRequestsCard';

export default function Home() {
  const [repoInput, setRepoInput] = useState('torvalds/linux');
  const [repoData, setRepoData] = useState(null);
  const [repoOwner, setRepoOwner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Parse repo link to extract owner and repo name
  const parseRepoLink = (input) => {
    // Handle full GitHub URLs
    if (input.includes('github.com/')) {
      const parts = input.split('github.com/')[1].split('/');
      return { owner: parts[0], repo: parts[1] };
    }
    // Handle owner/repo format
    const parts = input.split('/');
    if (parts.length === 2) {
      return { owner: parts[0], repo: parts[1] };
    }
    return null;
  };

  // Fetch repository and owner data from GitHub API
  const fetchRepoData = async (input) => {
    setLoading(true);
    setError(null);
    try {
      const parsed = parseRepoLink(input);
      if (!parsed) {
        throw new Error('Invalid repository format. Use "owner/repo" or full GitHub URL');
      }

      const { owner, repo } = parsed;

      // Fetch repository data
      const repoRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`
      );
      if (!repoRes.ok) throw new Error('Repository not found');
      const repoDataResponse = await repoRes.json();
      setRepoData(repoDataResponse);

      // Fetch repository owner data
      const ownerRes = await fetch(
        `https://api.github.com/users/${owner}`
      );
      if (!ownerRes.ok) throw new Error('Owner not found');
      const ownerDataResponse = await ownerRes.json();
      setRepoOwner(ownerDataResponse);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepoData(repoInput);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const searchInput = e.target.elements.search.value.trim();
    if (searchInput) {
      setRepoInput(searchInput);
      fetchRepoData(searchInput);
    }
  };

  return (
    <>
      <Head>
        <title>GitHub Repository Viewer</title>
        <meta
          name="description"
          content="View GitHub repository information and statistics"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Navbar />

      <main className="ml-64 bg-github-bg min-h-screen p-8">
        <div className="max-w-6xl">
          {/* Search Section */}
          <div className="mb-8">
            <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
              <input
                type="text"
                name="search"
                placeholder="Enter repo (owner/repo)"
                defaultValue={repoInput}
                className="flex-1 bg-github-border text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition"
              >
                Search
              </button>
            </form>
          </div>

          {error && (
            <div className="bg-red-900 bg-opacity-30 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-8">
              <p>Error: {error}</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block">
                <div className="animate-spin border-4 border-github-border border-t-blue-500 rounded-full w-12 h-12"></div>
                <p className="text-github-text mt-4">Loading repository...</p>
              </div>
            </div>
          )}

          {!loading && repoOwner && repoData && (
            <>
              {/* Repository Owner Profile Header */}
              <UserProfile user={repoOwner} />

              {/* Repository Information Section */}
              <h2 className="text-2xl font-bold text-white mb-6">
                Repository Information
              </h2>

              {/* Grid Layout: Stats + Activities + Pull Requests */}
              <div className="grid grid-cols-3 gap-6 h-96">
                {/* Left Column: Stars & Forks */}
                <div className="flex flex-col gap-6">
                  <StatsCard
                    title="Stars"
                    count={repoData.stargazers_count}
                    icon="⭐"
                  />
                  <StatsCard
                    title="Forks"
                    count={repoData.forks_count}
                    icon="🍴"
                  />
                </div>

                {/* Middle Column: Activities */}
                <ActivitiesCard activities={[]} />

                {/* Right Column: Pull Requests & Issues */}
                <PullRequestsCard pullRequests={[]} />
              </div>
            </>
          )}

          {!loading && !repoOwner && !error && (
            <div className="text-center py-12">
              <p className="text-github-muted text-lg">
                Enter a repository (e.g., "owner/repo") to get started
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
