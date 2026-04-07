"use client";

export type HealthIssueSignal = {
  priority?: string | null;
  reportCount?: number | null;
  trendPercent?: number | null;
};

export type SystemHealthTone = "good" | "warning" | "bad";

function numericValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizedPriority(value: unknown) {
  return String(value ?? "LOW").trim().toUpperCase();
}

export function deriveSystemHealthTone(
  issues: HealthIssueSignal[]
): SystemHealthTone {
  const hasBad = issues.some((issue) => {
    const priority = normalizedPriority(issue.priority);
    const reportCount = numericValue(issue.reportCount);
    const trendPercent = numericValue(issue.trendPercent);

    return priority === "HIGH" && (reportCount >= 25 || trendPercent >= 45);
  });

  if (hasBad) {
    return "bad";
  }

  const hasWarning = issues.some((issue) => {
    const priority = normalizedPriority(issue.priority);
    const reportCount = numericValue(issue.reportCount);
    const trendPercent = numericValue(issue.trendPercent);

    return priority === "MEDIUM" || priority === "HIGH" || reportCount >= 10 || trendPercent >= 18;
  });

  return hasWarning ? "warning" : "good";
}
