import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Explicit provider selection prevents a failed external database from silently
// switching to an unrelated data store. External connections must be explicitly configured.
export const databaseProvider = process.env.DB_PROVIDER ?? "supabase";
if (!["replit", "supabase"].includes(databaseProvider)) {
  throw new Error("DB_PROVIDER must be replit or supabase");
}
const dbUrl = databaseProvider === "replit"
  ? process.env.DATABASE_URL
  : process.env.APP_DATABASE_URL;

if (!dbUrl) {
  throw new Error(
    `${databaseProvider === "replit" ? "DATABASE_URL" : "APP_DATABASE_URL"} must be set.`,
  );
}

function parseDbUrl(url: string): pg.PoolConfig {
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    // node-postgres truncates usernames at the first dot when parsed from a
    // connection string (e.g. Supabase pooler uses postgres.PROJECT_REF).
    // Extract credentials explicitly so the full username is preserved.
    return {
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      host: u.hostname,
      port: u.port ? parseInt(u.port, 10) : 5432,
      database: u.pathname.replace(/^\//, ""),
      ssl: databaseProvider === "replit" && u.searchParams.get("sslmode") === "disable"
        ? false : { rejectUnauthorized: false },
      options: "-c search_path=public",
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 300000,
    };
  } catch {
    return {
      connectionString: url,
      ssl: databaseProvider === "replit" ? undefined : { rejectUnauthorized: false },
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 300000,
    };
  }
}

export const pool = new Pool(parseDbUrl(dbUrl));
export const db = drizzle(pool, { schema });

export async function withDbRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 2000,
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error("DB unreachable after retries");
}

export * from "./schema";
