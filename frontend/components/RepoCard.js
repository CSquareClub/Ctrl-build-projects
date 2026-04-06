import React from 'react';

export default function RepoCard({ repo }) {
  const defaultRepo = {
    name: 'Repository Name',
    description: 'A brief description of the repository',
    language: 'JavaScript',
    stargazers_count: 1234,
    forks_count: 567,
    html_url: '#',
  };

  const repoData = repo || defaultRepo;

  return (
    <a
      href={repoData.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-github-bg border border-github-border rounded-lg p-6 github-hover transition"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-blue-400 hover:underline">
          {repoData.name}
        </h3>
        <span className="bg-github-border text-github-text text-xs px-2 py-1 rounded-full">
          Public
        </span>
      </div>

      <p className="text-github-muted text-sm mb-4 line-clamp-2">
        {repoData.description || 'No description provided'}
      </p>

      <div className="flex items-center gap-4 text-xs text-github-muted">
        {repoData.language && (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
            {repoData.language}
          </div>
        )}
        <div className="flex items-center gap-1">
          <span>⭐</span>
          {repoData.stargazers_count}
        </div>
        <div className="flex items-center gap-1">
          <span>🍴</span>
          {repoData.forks_count}
        </div>
      </div>
    </a>
  );
}
