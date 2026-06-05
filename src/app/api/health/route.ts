import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Safe diagnostic — reports connectivity WITHOUT leaking host/credentials.
export async function GET() {
  const url = process.env.DATABASE_URL;
  let dbHostIsLocalhost: boolean | null = null;
  try {
    if (url) {
      const h = new URL(url).hostname;
      dbHostIsLocalhost = h === "127.0.0.1" || h === "localhost";
    }
  } catch {
    dbHostIsLocalhost = null;
  }

  let dbStatus = "skipped";
  let dbErrorCode: string | null = null;
  try {
    const { db } = await import("@/lib/db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`SELECT 1`);
    dbStatus = "ok";
  } catch (e) {
    dbStatus = "fail";
    // Only the error CODE (e.g. ECONNREFUSED, ETIMEDOUT, ER_ACCESS_DENIED_ERROR,
    // HANDSHAKE_SSL_ERROR) — no host or credentials.
    const err = e as { code?: string; errno?: number };
    dbErrorCode = err.code || (err.errno != null ? String(err.errno) : "UNKNOWN");
  }

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    hasDatabaseUrl: !!url,
    dbHostIsLocalhost,
    dbStatus,
    dbErrorCode,
  });
}
