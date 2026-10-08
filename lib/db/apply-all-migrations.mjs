#!/usr/bin/env node
/**
 * Non-interactive DB migration runner.
 * Applies every *.sql file in lib/db/drizzle/ via a raw pg client.
 * Safe to run multiple times — "already exists" errors are silently skipped.
 */
import pg from "pg";
import { readFileSync, readdirSync } from "fs";
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
    const user = decodeURIComponent(u.username);
    const pass = decodeURIComponent(u.password);
    return {
      user,
      password: pass,
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
const drizzleDir = join(__dirname, "drizzle");

// Collect all .sql files, sorted by name (version order)
const sqlFiles = readdirSync(drizzleDir)
  .filter(f => f.endsWith(".sql"))
  .sort()
  .map(f => join(drizzleDir, f));

if (sqlFiles.length === 0) {
  console.log("No migration files found — nothing to do.");
  process.exit(0);
}

function parseStatements(raw) {
  return raw
    .split("--> statement-breakpoint")
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      // Only add IF NOT EXISTS if not already present
      s = s
        .replace(/^CREATE TABLE (?!IF NOT EXISTS )/, 'CREATE TABLE IF NOT EXISTS ')
        .replace(/^CREATE UNIQUE INDEX (?!IF NOT EXISTS )/, "CREATE UNIQUE INDEX IF NOT EXISTS ")
        .replace(/^CREATE INDEX (?!IF NOT EXISTS )/, "CREATE INDEX IF NOT EXISTS ")
        .replace(/ADD COLUMN (?!IF NOT EXISTS )/g, "ADD COLUMN IF NOT EXISTS ");

      const typeMatch = s.match(
        /^CREATE TYPE "(?:public"\.)?"?(\w+)"? AS ENUM\(([\s\S]+)\);?$/
      );
      if (typeMatch) {
        const typeName = typeMatch[1];
        return `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${typeName}') THEN
    ${s.replace(/;?$/, "")};
  END IF;
END $$;`;
      }
      return s;
    });
}

const client = new Client(parseDbUrl(rawUrl));
await client.connect();

let totalApplied = 0;
let totalSkipped = 0;

for (const file of sqlFiles) {
  const raw = readFileSync(file, "utf-8");
  const statements = parseStatements(raw);
  let fileApplied = 0;
  let fileSkipped = 0;

  for (const stmt of statements) {
    try {
      await client.query(stmt);
      fileApplied++;
    } catch (err) {
      if (
        err.code === "42P07" || // duplicate_table
        err.code === "42710" || // duplicate_object (type/constraint)
        err.code === "42P06" || // duplicate_schema
        err.code === "23505" || // unique_violation (constraint already enforced)
        err.message?.includes("already exists")
      ) {
        fileSkipped++;
      } else {
        console.error(`Migration failed in ${file}:\n  ${stmt.slice(0, 200)}`);
        console.error(`  ${err.message}`);
        await client.end();
        // Fail hard: a broken migration must abort the deployment,
        // otherwise the API can start against an incomplete schema.
        process.exit(1);
      }
    }
  }

  console.log(`${file.split("/").pop()}: ${fileApplied} applied, ${fileSkipped} skipped`);
  totalApplied += fileApplied;
  totalSkipped += fileSkipped;
}

await client.end();
console.log(`\nTotal — ${totalApplied} applied, ${totalSkipped} already existed.`);
