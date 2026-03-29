export interface ImapConfig {
  host: string;
  port: number;
  secure: boolean;
  providerLabel: string | null;
}

const DEFAULT_CONFIG: ImapConfig = {
  host: "",
  port: 993,
  secure: true,
  providerLabel: null,
};

export function getImapConfig(email: string): ImapConfig {
  const domain = String(email || "")
    .trim()
    .toLowerCase()
    .split("@")[1];

  if (!domain) {
    return DEFAULT_CONFIG;
  }

  if (domain === "gmail.com") {
    return {
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      providerLabel: "Gmail",
    };
  }

  if (domain === "outlook.com" || domain === "hotmail.com") {
    return {
      host: "outlook.office365.com",
      port: 993,
      secure: true,
      providerLabel: "Outlook",
    };
  }

  if (domain === "yahoo.com") {
    return {
      host: "imap.mail.yahoo.com",
      port: 993,
      secure: true,
      providerLabel: "Yahoo",
    };
  }

  return DEFAULT_CONFIG;
}
