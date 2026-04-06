import React, { useState } from 'react';

export default function UserProfile({ user }) {
  const defaultUser = {
    login: 'username',
    avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
    followers: 1234,
    following: 567,
    bio: 'Full-stack developer | Open source enthusiast',
    company: 'TechCorp',
    location: 'San Francisco, CA',
    email: 'user@example.com',
    blog: 'https://example.com',
    twitter_username: 'twitter_handle',
  };

  const profileData = user || defaultUser;

  return (
    <div className="bg-github-bg border border-github-border rounded-lg p-8 mb-8">
      <div className="flex gap-8 items-start">
        {/* Avatar */}
        <div>
          <img
            src={profileData.avatar_url}
            alt={profileData.login}
            className="w-32 h-32 rounded-full border-4 border-github-border"
          />
        </div>

        {/* User Info */}
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white mb-2">
            {profileData.login}
          </h1>
          <p className="text-github-muted mb-4">{profileData.bio}</p>

          <div className="grid grid-cols-3 gap-8 mb-6">
            <div>
              <div className="text-2xl font-bold text-white">
                {profileData.followers}
              </div>
              <div className="text-github-muted text-sm">Followers</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {profileData.following}
              </div>
              <div className="text-github-muted text-sm">Following</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {profileData.public_repos || 24}
              </div>
              <div className="text-github-muted text-sm">Repositories</div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="space-y-2 text-github-text text-sm">
            {profileData.company && (
              <div className="flex items-center gap-2">
                <span className="text-github-muted">🏢</span>
                {profileData.company}
              </div>
            )}
            {profileData.location && (
              <div className="flex items-center gap-2">
                <span className="text-github-muted">📍</span>
                {profileData.location}
              </div>
            )}
            {profileData.blog && (
              <div className="flex items-center gap-2">
                <span className="text-github-muted">🔗</span>
                <a
                  href={profileData.blog}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  {profileData.blog}
                </a>
              </div>
            )}
            {profileData.twitter_username && (
              <div className="flex items-center gap-2">
                <span className="text-github-muted">𝕏</span>
                <a
                  href={`https://twitter.com/${profileData.twitter_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  @{profileData.twitter_username}
                </a>
              </div>
            )}
          </div>

          {/* Social Links Section */}
          <div className="mt-6 pt-6 border-t border-github-border">
            <h3 className="text-sm font-semibold text-white mb-3">
              Social Links
            </h3>
            <div className="flex gap-3">
              {profileData.twitter_username && (
                <a
                  href={`https://twitter.com/${profileData.twitter_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-github-border hover:bg-blue-600 text-github-text px-3 py-2 rounded text-xs transition"
                >
                  Twitter
                </a>
              )}
              <a
                href={`https://github.com/${profileData.login}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-github-border hover:bg-blue-600 text-github-text px-3 py-2 rounded text-xs transition"
              >
                GitHub Profile
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
