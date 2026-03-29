export const DEMO_EMAIL = "smosm1309@gmail.com";

export function isDemoUser(email?: string | null) {
  return (email ?? "").toLowerCase() === DEMO_EMAIL;
}
