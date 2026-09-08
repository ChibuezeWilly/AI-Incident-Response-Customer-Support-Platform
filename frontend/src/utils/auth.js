/**
 * Auth utilities — user session caching with 1 day expiry.
 * Stores user info in localStorage so the app remembers who logged in.
 */
const AUTH_KEY = "irs_auth_user";

const SESSION_HOURS = 7;

export function getCachedUser() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(AUTH_KEY);

    if (!raw) {
      return null;
    }

    const cached = JSON.parse(raw);

    if (Date.now() > cached.expiresAt) {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }

    return cached.user;
  } catch {
    return null;
  }
}

export function cacheUser(user) {
  if (typeof window === "undefined") {
    return;
  }

  const cached = {
    user,
    expiresAt: Date.now() + SESSION_HOURS * 60 * 60 * 1000,
  };

  localStorage.setItem(AUTH_KEY, JSON.stringify(cached));
}

export function clearCachedUser() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(AUTH_KEY);
}

export function isAuthenticated() {
  return getCachedUser() !== null;
}
