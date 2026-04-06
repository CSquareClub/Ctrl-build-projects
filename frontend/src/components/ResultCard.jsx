import React from "react";
import PriorityBadge from "./PriorityBadge";

const ResultCard = ({ result }) => {
  if (!result) return null;

  return (
    <div className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/20 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-on-background mb-2">
            Analysis Results
          </h2>
          <p className="text-outline">{result.title}</p>
        </div>
        {result.priority && <PriorityBadge priority={result.priority} />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <p className="text-xs font-medium text-primary uppercase tracking-wider">
            Classification
          </p>
          <p className="text-lg font-semibold text-on-surface">
            {result.classification || "N/A"}
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-primary uppercase tracking-wider">
            Confidence
          </p>
          <p className="text-lg font-semibold text-on-surface">
            {result.confidence ? `${Math.round(result.confidence * 100)}%` : "N/A"}
          </p>
        </div>
      </div>

      {result.description && (
        <div className="space-y-3 pt-4 border-t border-outline-variant/20">
          <p className="text-xs font-medium text-primary uppercase tracking-wider">
            Summary
          </p>
          <p className="text-on-surface">{result.description}</p>
        </div>
      )}
    </div>
  );
};

export default ResultCard;
