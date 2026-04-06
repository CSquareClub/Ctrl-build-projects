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
    <div className="bg-github-bg border border-github-border rounded-lg p-6 mb-8">
      <div className="flex gap-6 items-start">
        {/* Avatar */}
        <div>
          <img
            src={profileData.avatar_url}
            alt={profileData.login}
            className="w-24 h-24 rounded-full border-4 border-github-border"
          />
        </div>

        {/* User Info */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white mb-1">
            {profileData.login}
          </h1>
          <p className="text-github-muted text-sm mb-4">{profileData.bio}</p>

          <div className="grid grid-cols-3 gap-6 mb-4">
            <div>
              <div className="text-xl font-bold text-white">
                {profileData.followers}
              </div>
              <div className="text-github-muted text-xs">Followers</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">
                {profileData.following}
              </div>
              <div className="text-github-muted text-xs">Connections</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                <a href="#" className="text-blue-400 hover:underline">🔗</a>
              </div>
              <div className="text-github-muted text-xs">Social Links</div>
            </div>
          </div>

          {/* Additional Info Row */}
          <div className="flex flex-wrap gap-4 text-github-text text-xs">
            {profileData.company && (
              <div className="flex items-center gap-1">
                <span>🏢</span>
                <span>{profileData.company}</span>
              </div>
            )}
            {profileData.location && (
              <div className="flex items-center gap-1">
                <span>📍</span>
                <span>{profileData.location}</span>
              </div>
            )}
            {profileData.blog && (
              <div className="flex items-center gap-1">
                <span>🔗</span>
                <a
                  href={profileData.blog}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline truncate"
                >
                  {profileData.blog}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
