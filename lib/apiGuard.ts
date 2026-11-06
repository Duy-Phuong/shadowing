/**
 * Request checks for the local-only API. The app has no login, so it trusts
 * only requests made from its own pages on this machine:
 *  - Host must be a loopback name — blocks DNS rebinding, where a hostile site
 *    points its own domain at 127.0.0.1 to read and write this API.
 *  - A state-changing request from a browser must be same-origin — blocks
 *    CSRF, where a hostile page POSTs here (e.g. to wipe the vocabulary).
 * Requests without browser headers (curl, scripts) are allowed: they can't be
 * forged by a web page.
 */

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Hostname part of a Host header value, lowercased, IPv6 kept in brackets. */
function hostname(host: string): string {
  const h = host.trim().toLowerCase();
  if (h.startsWith("[")) return h.slice(0, h.indexOf("]") + 1);
  return h.split(":")[0];
}

export interface GuardInput {
  method: string;
  host: string | null;
  origin: string | null;
  secFetchSite: string | null;
}

/** Returns a reason to reject the request, or null when it may proceed. */
export function rejectReason(req: GuardInput): string | null {
  if (!req.host || !LOOPBACK.has(hostname(req.host))) return "host_not_allowed";
  if (SAFE_METHODS.has(req.method.toUpperCase())) return null;

  if (req.secFetchSite && !["same-origin", "none"].includes(req.secFetchSite)) {
    return "cross_site";
  }
  if (req.origin) {
    let originHost: string;
    try {
      originHost = new URL(req.origin).host;
    } catch {
      return "cross_site"; // e.g. "null" from a sandboxed frame
    }
    if (originHost.toLowerCase() !== req.host.trim().toLowerCase()) {
      return "cross_site";
    }
  }
  return null;
}
