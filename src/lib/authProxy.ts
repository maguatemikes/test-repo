import { NextResponse } from "next/server";

/**
 * Shared helper for the /api/auth/* proxy routes.
 *
 * The frontend never talks to the NetX .NET auth service directly. Each route
 * handler forwards its payload here, then maps the upstream status into the
 * app's `{ ok, code?, error? }` shape that the auth views understand.
 */

const API_BASE = process.env.NETX_API_BASE_URL;

export function fail(code: string, error: string, status: number) {
  return NextResponse.json({ ok: false, code, error }, { status });
}

export type NetxCall =
  | { ok: true; upstream: Response }
  | { ok: false; response: NextResponse };

/**
 * POST a JSON payload to the NetX auth API. Handles config + network errors.
 * Pass `cookie` for authenticated endpoints so the session is forwarded.
 */
export async function callNetx(
  path: string,
  payload: unknown,
  opts?: { cookie?: string | null; method?: string },
): Promise<NetxCall> {
  if (!API_BASE) {
    return {
      ok: false,
      response: fail("server", "Authentication service is not configured.", 503),
    };
  }
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (opts?.cookie) headers["cookie"] = opts.cookie;
    const upstream = await fetch(`${API_BASE}${path}`, {
      method: opts?.method ?? "POST",
      headers,
      body: JSON.stringify(payload),
      redirect: "manual",
    });
    return { ok: true, upstream };
  } catch {
    return {
      ok: false,
      response: fail("server", "Could not reach the authentication service.", 502),
    };
  }
}

/** Copy any Set-Cookie the backend issued onto our response (session login). */
export function relaySessionCookie(from: Response, to: NextResponse) {
  const cookie = from.headers.get("set-cookie");
  if (cookie) to.headers.set("set-cookie", cookie);
  return to;
}

/** Best-effort parse of an upstream JSON error body. */
export async function readUpstreamReason(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as
    | { code?: string; reason?: string; message?: string }
    | null;
  // Backend uses a machine-readable `code` (e.g. "email_taken"); fall back to text.
  return (body?.code ?? body?.reason ?? body?.message ?? "").toLowerCase();
}
