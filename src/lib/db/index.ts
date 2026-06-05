import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

// The omnc server currently presents a self-signed TLS cert (and isn't TLS-
// hardened yet), so forcing strict TLS breaks the connection in production.
// Default to a plain connection; opt into (unverified) TLS with DB_SSL=true.
const ssl = process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined;

const connection = await mysql.createPool({
  uri: process.env.DATABASE_URL,
  ssl,
});

export const db = drizzle(connection, { schema, mode: "default" });
