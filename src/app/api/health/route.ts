import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Diagnostic endpoint — reports env + DB connectivity without exposing secrets.
export async function GET() {
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  let dbHost: string | null = null;
  try {
    dbHost = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).host : null;
  } catch {
    dbHost = "unparseable";
  }

  let dbStatus = "skipped";
  let dbError: string | null = null;
  try {
    const { db } = await import("@/lib/db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`SELECT 1`);
    dbStatus = "ok";
  } catch (e) {
    dbStatus = "fail";
    dbError = (e as Error).message;
  }

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    hasDatabaseUrl,
    dbHost,
    dbStatus,
    dbError,
  });
}
