import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const connection = await mysql.createPool({
  uri: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? {} : undefined,
});

export const db = drizzle(connection, { schema, mode: "default" });
