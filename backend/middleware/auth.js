const supabase = require('../lib/supabaseClient');

function isPublicPath(pathname = '') {
  return [
    '/auth/register',
    '/api/auth/register',
    '/integrations/gmail/callback',
    '/api/integrations/gmail/callback',
    '/integrations/outlook/callback',
    '/api/integrations/outlook/callback',
    '/integrations/github/callback',
    '/api/integrations/github/callback',
    '/cron/sync',
    '/api/cron/sync',
    '/cron/analyze',
    '/api/cron/analyze',
    '/cron/insights',
    '/api/cron/insights',
    '/cron/inspect',
    '/api/cron/inspect',
    '/sdk/event',
    '/api/sdk/event',
    '/sdk/events',
    '/api/sdk/events',
    '/sdk/feedback',
    '/api/sdk/feedback',
    '/sdk/error',
    '/api/sdk/error',
  ].includes(pathname);
}

const requireAuth = async (req, res, next) => {
  try {
    if (req.method === 'OPTIONS' || isPublicPath(req.path) || isPublicPath(req.originalUrl)) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the JWT via Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach user payload to the request
    req.user = { id: user.id, email: user.email };
    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

module.exports = { requireAuth };
