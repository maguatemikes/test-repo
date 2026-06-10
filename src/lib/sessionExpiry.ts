/**
 * Session-expiry plumbing for the global re-auth modal (#60).
 *
 * Installs a one-time wrapper around window.fetch that watches for 401s on
 * app/data requests (not the auth endpoints themselves) and dispatches a
 * window event the SessionExpiredModal listens for. The original response is
 * always returned untouched, so callers behave exactly as before.
 */

export const SESSION_EXPIRED_EVENT = "crm:session-expired";

let installed = false;
let lastEmail = "";

export function setLastEmail(email: string) {
  lastEmail = email;
}

export function getLastEmail() {
  return lastEmail;
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

export function installSessionExpiryInterceptor() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await original(input, init);
    try {
      const url = urlOf(input);
      // Ignore the auth endpoints (so re-login can't retrigger the modal) and
      // the /api/me probe (its 401 just means "not logged in", handled inline).
      const isAuthCall = url.includes("/api/auth/") || url.includes("/api/me");
      if (res.status === 401 && !isAuthCall) {
        window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
      }
    } catch {
      // Never let bookkeeping interfere with the actual request.
    }
    return res;
  };
}
