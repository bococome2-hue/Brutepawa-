import pg from "pg";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const { Client } = pg;

const provider = process.env.DB_PROVIDER ?? "supabase";
if (!["replit", "supabase"].includes(provider)) throw new Error("Invalid DB_PROVIDER");
if (provider === "replit" && process.env.NODE_ENV === "production") {
  throw new Error("Managed production schema changes must use the Publish flow");
}
const rawUrl = provider === "replit" ? process.env.DATABASE_URL : process.env.APP_DATABASE_URL;
if (!rawUrl) throw new Error("Selected database connection is not configured");

function parseDbUrl(url) {
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    return {
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      host: u.hostname,
      port: u.port ? parseInt(u.port, 10) : 5432,
      database: u.pathname.replace(/^\//, ""),
      ssl: provider === "replit" && u.searchParams.get("sslmode") === "disable"
        ? false : { rejectUnauthorized: false },
    };
  } catch {
    return { connectionString: url, ssl: provider === "replit" ? undefined : { rejectUnauthorized: false } };
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationSql = readFileSync(join(__dirname, "migrations/001_full_text_search.sql"), "utf-8");

const client = new Client(parseDbUrl(rawUrl));
await client.connect();
try {
  console.log("Running migration: 001_full_text_search.sql");
  await client.query(migrationSql);
  console.log("Migration complete.");
} finally {
  await client.end();
}
