"use client";

import { useEffect, useState } from "react";
import { Check, Pencil, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toUserFacingError } from "@/lib/user-facing-errors";

interface DecisionFeedbackBarProps {
  token: string | null | undefined;
  issueType: string;
  compact?: boolean;
}

type FeedbackAction = "accept" | "reject" | "edit";

export default function DecisionFeedbackBar({
  token,
  issueType,
  compact = false,
}: DecisionFeedbackBarProps) {
  const [submittedAction, setSubmittedAction] = useState<FeedbackAction | null>(null);
  const [submitting, setSubmitting] = useState<FeedbackAction | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setSubmittedAction(null);
    setSubmitting(null);
    setToast(null);
  }, [issueType]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const submit = async (action: FeedbackAction) => {
    if (!token || submitting || submittedAction) {
      return;
    }

    setSubmitting(action);

    try {
      await api.agent.feedbackAction(token, {
        issue_type: issueType,
        action,
      });
      setSubmittedAction(action);
      setToast(
        action === "accept"
          ? "Learning from this decision"
          : action === "reject"
            ? "Feedback recorded. Improving future suggestions."
            : "Adjustment noted"
      );
    } catch (error) {
      setToast(toUserFacingError(error, "agent-settings"));
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="sticky bottom-4 z-10 w-full max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:static dark:border-slate-800 dark:bg-[#141414]/95 dark:shadow-none">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Was this helpful?</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            Your feedback improves future confidence and actions.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button
            variant={submittedAction === "accept" ? "default" : "secondary"}
            className={`w-full min-w-0 ${compact ? "sm:w-auto" : ""}`}
            onClick={() => void submit("accept")}
            disabled={Boolean(submitting || submittedAction)}
          >
            {submittedAction === "accept" ? (
              <Check className="h-4 w-4" />
            ) : (
              <ThumbsUp className="h-4 w-4" />
            )}
            Accept
          </Button>
          <Button
            variant={submittedAction === "reject" ? "destructive" : "secondary"}
            className={`w-full min-w-0 ${compact ? "sm:w-auto" : ""}`}
            onClick={() => void submit("reject")}
            disabled={Boolean(submitting || submittedAction)}
          >
            {submittedAction === "reject" ? (
              <Check className="h-4 w-4" />
            ) : (
              <ThumbsDown className="h-4 w-4" />
            )}
            Reject
          </Button>
          <Button
            variant={submittedAction === "edit" ? "default" : "secondary"}
            className={`w-full min-w-0 ${compact ? "sm:w-auto" : ""}`}
            onClick={() => void submit("edit")}
            disabled={Boolean(submitting || submittedAction)}
          >
            {submittedAction === "edit" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Pencil className="h-4 w-4" />
            )}
            Edit
          </Button>
        </div>
      </div>

      {toast ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
