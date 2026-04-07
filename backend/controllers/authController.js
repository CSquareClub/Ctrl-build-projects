const supabase = require("../lib/supabaseClient");
const { ensureUserRecords } = require("../lib/ensureUserRecords");
const {
  fetchGitHubProfile,
  getGitHubConnection,
  upsertGitHubConnection,
} = require("../services/githubService");

async function register(req, res) {
  const { email, password, fullName } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName ?? "",
    },
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  await ensureUserRecords({
    id: data.user?.id ?? null,
    email: data.user?.email ?? email,
  });

  return res.status(201).json({
    user: {
      id: data.user?.id ?? null,
      email: data.user?.email ?? email,
    },
  });
}

async function syncGitHubSession(req, res) {
  const providerToken = String(
    req.body?.providerToken ||
      req.body?.provider_token ||
      req.body?.accessToken ||
      req.body?.access_token ||
      ""
  ).trim();

  if (!providerToken) {
    return res.status(400).json({ error: "providerToken is required." });
  }

  try {
    await ensureUserRecords({
      id: req.user?.id ?? null,
      email: req.user?.email ?? null,
    });

    let profile = null;
    try {
      profile = await fetchGitHubProfile(providerToken);
    } catch (error) {
      console.error("GitHub profile fetch failed during session sync:", error);
    }

    const existingConnection = await getGitHubConnection(req.user.id).catch(() => null);

    await upsertGitHubConnection(req.user.id, {
      accessToken: providerToken,
      profile,
      repoOwner: existingConnection?.repoOwner || null,
      repoName: existingConnection?.repoName || null,
      defaultBranch: existingConnection?.defaultBranch || null,
    });

    return res.json({
      success: true,
      github: {
        username: profile?.login || null,
        avatarUrl: profile?.avatar_url || null,
        id: profile?.id || null,
      },
    });
  } catch (error) {
    console.error("GitHub session sync failed:", error);
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to sync GitHub session.",
    });
  }
}

module.exports = {
  register,
  syncGitHubSession,
};
