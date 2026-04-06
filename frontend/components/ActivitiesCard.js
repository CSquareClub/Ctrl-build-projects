import React from 'react';

export default function ActivitiesCard({ activities }) {
  const defaultActivities = [
    {
      id: 1,
      type: 'PushEvent',
      repo: 'repo-name',
      message: 'Pushed 5 commits',
      timestamp: '2 hours ago',
    },
    {
      id: 2,
      type: 'PullRequestEvent',
      repo: 'repo-name',
      message: 'Opened pull request #123',
      timestamp: '1 day ago',
    },
    {
      id: 3,
      type: 'IssueEvent',
      repo: 'repo-name',
      message: 'Opened issue #456',
      timestamp: '3 days ago',
    },
  ];

  const activitiesList = activities || defaultActivities;

  return (
    <div className="bg-github-bg border border-github-border rounded-lg p-6 flex flex-col">
      <h2 className="text-lg font-bold text-white mb-4">Activities</h2>

      <div className="flex-1 overflow-y-auto space-y-3">
        {activitiesList.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 pb-3 border-b border-github-border last:border-b-0"
          >
            <div className="text-lg flex-shrink-0 mt-1">
              {activity.type === 'PushEvent' && '📝'}
              {activity.type === 'PullRequestEvent' && '🔀'}
              {activity.type === 'IssueEvent' && '⚠️'}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-github-text text-xs">
                <span className="font-mono text-github-muted">
                  {activity.repo}
                </span>
              </div>
              <p className="text-white font-medium text-xs">{activity.message}</p>
              <p className="text-github-muted text-xs mt-1">{activity.timestamp}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
