import React from "react";

const SimilarIssues = ({ issues = [] }) => {
  if (!issues || issues.length === 0) {
    return (
      <div className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/20 text-center">
        <p className="text-outline">No similar issues found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-on-background mb-2">
          Similar Issues
        </h3>
        <p className="text-outline">
          Found {issues.length} similar issue{issues.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid gap-4">
        {issues.map((issue, index) => (
          <div
            key={index}
            className="bg-surface-container-low p-6 rounded-lg border border-outline-variant/20 hover:border-primary/30 transition-all"
          >
            <p className="font-semibold text-on-background mb-2">
              {issue.title || `Issue ${index + 1}`}
            </p>
            <p className="text-outline text-sm mb-3">{issue.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-primary uppercase tracking-wider font-medium">
                Similarity Score
              </span>
              <span className="text-sm font-semibold text-on-surface">
                {issue.similarity_score
                  ? `${Math.round(issue.similarity_score * 100)}%`
                  : "N/A"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimilarIssues;
