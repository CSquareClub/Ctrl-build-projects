import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import UserProfile from '../components/UserProfile';
import Sidebar from '../components/Sidebar';
import StatsCard from '../components/StatsCard';
import RepoCard from '../components/RepoCard';
import ActivitiesCard from '../components/ActivitiesCard';
import PullRequestsCard from '../components/PullRequestsCard';

export default function Home() {
  const [userName, setUserName] = useState('octocat');
  const [userData, setUserData] = useState(null);
  const [userRepos, setUserRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch user data from GitHub API
  const fetchUserData = async (username) => {
    setLoading(true);
    setError(null);
    try {
      // User data
      const userRes = await fetch(`https://api.github.com/users/${username}`);
      if (!userRes.ok) throw new Error('User not found');
      const user = await userRes.json();
      setUserData(user);

      // User repos
      const reposRes = await fetch(
        `https://api.github.com/users/${username}/repos?sort=stars&per_page=6`
      );
      const repos = await reposRes.json();
      setUserRepos(repos);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData(userName);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const searchInput = e.target.elements.search.value.trim();
    if (searchInput) {
      setUserName(searchInput);
      fetchUserData(searchInput);
    }
  };

  return (
    <>
      <Head>
        <title>GitHub Profile Viewer | Dynamic Repository Dashboard</title>
        <meta
          name="description"
          content="View GitHub user profiles and repository information with an interactive dashboard"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar />

      <main className="bg-github-bg min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Search Section */}
          <div className="mb-8">
            <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
              <input
                type="text"
                name="search"
                placeholder="Enter GitHub username"
                defaultValue={userName}
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
              <p className="text-sm mt-1">Please check the username and try again.</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block">
                <div className="animate-spin border-4 border-github-border border-t-blue-500 rounded-full w-12 h-12"></div>
                <p className="text-github-text mt-4">Loading profile...</p>
              </div>
            </div>
          )}

          {!loading && userData && (
            <>
              {/* User Profile Header */}
              <UserProfile user={userData} />

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <StatsCard
                      title="Stars"
                      count={userRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0)}
                      icon="⭐"
                    />
                    <StatsCard
                      title="Forks"
                      count={userRepos.reduce((sum, repo) => sum + repo.forks_count, 0)}
                      icon="🍴"
                    />
                    <StatsCard
                      title="Public Repos"
                      count={userData.public_repos}
                      icon="📦"
                    />
                  </div>

                  {/* Repositories Section */}
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      Top Repositories
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userRepos.length > 0 ? (
                        userRepos.map((repo) => (
                          <RepoCard key={repo.id} repo={repo} />
                        ))
                      ) : (
                        <p className="text-github-muted col-span-2">
                          No public repositories found.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sidebar - Activities */}
                <div>
                  <Sidebar userName={userName} />
                </div>
              </div>

              {/* Bottom Section - Activities & PRs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ActivitiesCard activities={[]} />
                <PullRequestsCard pullRequests={[]} />
              </div>
            </>
          )}

          {!loading && !userData && !error && (
            <div className="text-center py-12">
              <p className="text-github-muted text-lg">
                Enter a GitHub username to get started
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-github-bg border-t border-github-border mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-github-muted text-sm">
          <p>
            Built with Next.js & Tailwind CSS | Data from{' '}
            <a
              href="https://developer.github.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              GitHub API
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
