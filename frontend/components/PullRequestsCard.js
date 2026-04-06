import React from 'react';

export default function PullRequestsCard({ pullRequests }) {
  const defaultPRs = [
    {
      id: 1,
      title: 'Add new feature',
      state: 'open',
      number: 123,
      repo: 'repo-name',
      createdAt: '2 days ago',
    },
    {
      id: 2,
      title: 'Fix bug in authentication',
      state: 'closed',
      number: 122,
      repo: 'repo-name',
      createdAt: '5 days ago',
    },
    {
      id: 3,
      title: 'Update dependencies',
      state: 'closed',
      number: 121,
      repo: 'repo-name',
      createdAt: '1 week ago',
    },
  ];

  const prsList = pullRequests || defaultPRs;

  return (
    <div className="bg-github-bg border border-github-border rounded-lg p-6">
      <h2 className="text-lg font-bold text-white mb-4">
        Pull Requests & Issues
      </h2>

      <div className="space-y-3">
        {prsList.map((pr) => (
          <div
            key={pr.id}
            className="flex items-center gap-3 p-3 bg-github-border bg-opacity-30 rounded hover:bg-opacity-50 transition cursor-pointer"
          >
            <div className="flex-shrink-0">
              {pr.state === 'open' ? (
                <span className="text-green-500 text-lg">🟢</span>
              ) : (
                <span className="text-red-500 text-lg">🔴</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-github-text text-xs bg-github-border px-2 py-1 rounded">
                  #{pr.number}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded font-medium ${
                    pr.state === 'open'
                      ? 'bg-green-900 bg-opacity-30 text-green-300'
                      : 'bg-purple-900 bg-opacity-30 text-purple-300'
                  }`}
                >
                  {pr.state.toUpperCase()}
                </span>
              </div>
              <p className="text-white text-sm font-medium truncate">
                {pr.title}
              </p>
              <p className="text-github-muted text-xs mt-1">
                {pr.repo} • {pr.createdAt}
              </p>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-4 py-2 text-center bg-github-border hover:bg-blue-600 text-github-text hover:text-white rounded transition text-sm font-medium">
        View All PRs & Issues
      </button>
    </div>
  );
}
