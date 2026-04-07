const { getGitHubConnection } = require('../services/githubService');
const {
  getProductSetupStatus,
  saveProductSetup,
} = require('../services/productSetupService');
const { setSelectedRepository } = require('../services/githubService');

async function getSetupStatus(req, res) {
  try {
    const status = await getProductSetupStatus(req.user);
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load setup status.',
    });
  }
}

async function completeSetup(req, res) {
  try {
    const productName = String(req.body?.productName || '').trim();
    const websiteUrl = String(req.body?.websiteUrl || '').trim();
    const inspectionLoginUrl = String(req.body?.inspectionLoginUrl || '').trim();
    const inspectionUsername = String(req.body?.inspectionUsername || '').trim();
    const inspectionPassword = String(req.body?.inspectionPassword || '').trim();
    const inspectionPostLoginSelector = String(req.body?.inspectionPostLoginSelector || '').trim();
    const requestedRepoOwner = String(req.body?.repoOwner || '').trim();
    const requestedRepoName = String(req.body?.repoName || '').trim();

    if (websiteUrl) {
      try {
        const parsed = new URL(websiteUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('invalid');
        }
      } catch {
        return res.status(400).json({ error: 'websiteUrl must be a valid http/https URL.' });
      }
    }

    const hasInspectionAccessInput = Boolean(
      inspectionLoginUrl || inspectionUsername || inspectionPassword || inspectionPostLoginSelector
    );

    if (hasInspectionAccessInput) {
      if (!inspectionLoginUrl || !inspectionUsername || !inspectionPassword) {
        return res.status(400).json({
          error: 'inspectionLoginUrl, inspectionUsername, and inspectionPassword are required together.',
        });
      }

      try {
        const parsed = new URL(inspectionLoginUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('invalid');
        }
      } catch {
        return res.status(400).json({
          error: 'inspectionLoginUrl must be a valid http/https URL.',
        });
      }
    }

    if (Boolean(requestedRepoOwner) !== Boolean(requestedRepoName)) {
      return res.status(400).json({
        error: 'repoOwner and repoName must be provided together.',
      });
    }

    let githubConnection = await getGitHubConnection(req.user.id).catch(() => null);

    if (requestedRepoOwner && requestedRepoName) {
      if (!githubConnection) {
        return res.status(400).json({
          error: 'Connect GitHub before selecting a primary repository.',
        });
      }

      await setSelectedRepository(req.user.id, requestedRepoOwner, requestedRepoName);
      githubConnection = await getGitHubConnection(req.user.id);
    }

    const repoOwner =
      requestedRepoOwner ||
      githubConnection?.repoOwner ||
      githubConnection?.metadata?.repo_owner ||
      '';
    const repoName =
      requestedRepoName ||
      githubConnection?.repoName ||
      githubConnection?.metadata?.repo_name ||
      '';

    const record = await saveProductSetup(req.user.id, {
      productName,
      websiteUrl,
      inspectionLoginUrl,
      inspectionUsername,
      inspectionPassword,
      inspectionPostLoginSelector,
      repoOwner,
      repoName,
    });

    res.json({
      complete: Boolean(
        record.product_name ||
          record.website_url ||
          record.inspection_login_url ||
          (record.repo_owner && record.repo_name)
      ),
      productName: record.product_name,
      websiteUrl: record.website_url,
      inspectionAccess: {
        enabled: Boolean(
          record.inspection_login_url &&
            record.inspection_username &&
            record.inspection_password
        ),
        loginUrl: record.inspection_login_url || '',
        username: record.inspection_username || '',
        postLoginSelector: record.inspection_post_login_selector || '',
        passwordConfigured: Boolean(record.inspection_password),
      },
      repository:
        record.repo_owner && record.repo_name
          ? {
              owner: record.repo_owner,
              name: record.repo_name,
            }
          : null,
      githubConnected: Boolean(githubConnection),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to complete setup.',
    });
  }
}

module.exports = {
  completeSetup,
  getSetupStatus,
};
