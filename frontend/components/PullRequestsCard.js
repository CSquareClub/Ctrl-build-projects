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
    <div className="bg-github-bg border border-github-border rounded-lg p-6 flex flex-col">
      <h2 className="text-lg font-bold text-white mb-4">
        Pull Request & Issues
      </h2>

      <div className="flex-1 overflow-y-auto space-y-2">
        {prsList.map((pr) => (
          <div
            key={pr.id}
            className="flex items-start gap-2 p-2 bg-github-border bg-opacity-30 rounded hover:bg-opacity-50 transition cursor-pointer"
          >
            <div className="flex-shrink-0 mt-1">
              {pr.state === 'open' ? (
                <span className="text-green-500 text-base">🟢</span>
              ) : (
                <span className="text-red-500 text-base">🔴</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-github-text text-xs bg-github-border px-1.5 py-0.5 rounded">
                  #{pr.number}
                </span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    pr.state === 'open'
                      ? 'bg-green-900 bg-opacity-30 text-green-300'
                      : 'bg-purple-900 bg-opacity-30 text-purple-300'
                  }`}
                >
                  {pr.state.toUpperCase()}
                </span>
              </div>
              <p className="text-white text-xs font-medium truncate">
                {pr.title}
              </p>
              <p className="text-github-muted text-xs mt-0.5">
                {pr.repo} • {pr.createdAt}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
