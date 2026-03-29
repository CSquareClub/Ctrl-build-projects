"use client";

export type UserFacingErrorContext =
  | "auth-login"
  | "auth-signup"
  | "auth-google"
  | "auth-reset"
  | "sdk-load"
  | "profile-update"
  | "password-update"
  | "ai-helper"
  | "issues-load"
  | "issue-detail-load"
  | "timeline-load"
  | "weekly-report-load"
  | "tickets-load"
  | "ticket-create"
  | "ticket-update"
  | "ticket-delete"
  | "reminders-load"
  | "reminder-create"
  | "reminder-update"
  | "reminder-delete";

function getRawMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "";
}

export function toUserFacingError(
  error: unknown,
  context: UserFacingErrorContext
) {
  const raw = getRawMessage(error);
  const normalized = raw.toLowerCase();

  if (
    normalized.includes("missing or invalid authorization header") ||
    normalized.includes("jwt") ||
    normalized.includes("unauthorized") ||
    normalized.includes("session expired")
  ) {
    return "Your session needs to be refreshed. Please sign in again and try once more.";
  }

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("network request failed")
  ) {
    return "We couldn't reach Product Pulse right now. Please check your connection and try again.";
  }

  if (normalized.includes("too many requests") || normalized.includes("429")) {
    switch (context) {
      case "ai-helper":
        return "AI Helper is temporarily busy. Please wait a moment and try again.";
      case "timeline-load":
      case "weekly-report-load":
        return "Insights are temporarily refreshing too often. Please try again in a minute.";
      default:
        return "This action is being rate-limited right now. Please wait a bit and try again.";
    }
  }

  switch (context) {
    case "auth-login":
      if (
        normalized.includes("invalid login credentials") ||
        normalized.includes("invalid_credentials") ||
        normalized.includes("email not confirmed")
      ) {
        return "That email and password combination didn’t match. Please check your details and try again.";
      }
      return "We couldn't sign you in right now. Please try again.";

    case "auth-signup":
      if (normalized.includes("already registered") || normalized.includes("user already")) {
        return "An account already exists for this email. Try logging in instead.";
      }
      if (normalized.includes("password")) {
        return "We couldn't create your account with that password. Please review the password rules and try again.";
      }
      return "We couldn't create your account right now. Please try again.";

    case "auth-google":
      return "We couldn't continue with Google right now. Please try again in a moment.";

    case "auth-reset":
      if (normalized.includes("user not found")) {
        return "We couldn’t find an account for that email. Double-check it and try again.";
      }
      return "We couldn't send the reset link right now. Please try again.";

    case "profile-update":
      return "We couldn't update your profile right now. Please try again.";

    case "sdk-load":
      return "We couldn't load your SDK credentials right now. Please refresh and try again.";

    case "password-update":
      if (normalized.includes("same password")) {
        return "Choose a new password that’s different from your current one.";
      }
      return "We couldn't update your password right now. Please try again.";

    case "ai-helper":
      if (normalized.includes("please type a question")) {
        return "Type a question for AI Helper to get started.";
      }
      return "AI Helper couldn’t answer that just now. Please try again in a moment.";

    case "issues-load":
      return "We couldn't load your issues right now. Please refresh and try again.";

    case "issue-detail-load":
      return "We couldn't load that issue right now. Please go back and try again.";

    case "timeline-load":
      return "We couldn't load your system timeline right now. Please try again shortly.";

    case "weekly-report-load":
      return "We couldn't generate the weekly insight report right now. Please try again shortly.";

    case "tickets-load":
      return "We couldn't load your tickets right now. Please refresh and try again.";

    case "ticket-create":
      return "We couldn't create that ticket right now. Please try again.";

    case "ticket-update":
      return "We couldn't update that ticket right now. Please try again.";

    case "ticket-delete":
      return "We couldn't delete that ticket right now. Please try again.";

    case "reminders-load":
      return "We couldn't load reminders right now. Please refresh and try again.";

    case "reminder-create":
      return "We couldn't create that reminder right now. Please try again.";

    case "reminder-update":
      return "We couldn't update that reminder right now. Please try again.";

    case "reminder-delete":
      return "We couldn't delete that reminder right now. Please try again.";

    default:
      return "Something went wrong. Please try again.";
  }
}
