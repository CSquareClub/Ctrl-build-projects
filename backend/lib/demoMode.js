const DEMO_EMAIL = 'smosm1309@gmail.com';

function isDemoUser(userOrEmail) {
  const email =
    typeof userOrEmail === 'string' ? userOrEmail : userOrEmail?.email || null;

  return String(email || '').toLowerCase() === DEMO_EMAIL;
}

module.exports = {
  DEMO_EMAIL,
  isDemoUser,
};
