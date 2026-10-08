import { defineConfig } from "drizzle-kit";

const provider = process.env.DB_PROVIDER ?? "supabase";
if (!["replit", "supabase"].includes(provider)) {
  throw new Error("DB_PROVIDER must be replit or supabase");
}
const rawUrl = provider === "replit" ? process.env.DATABASE_URL : process.env.APP_DATABASE_URL;

if (!rawUrl) {
  throw new Error(`${provider === "replit" ? "DATABASE_URL" : "APP_DATABASE_URL"} must be set`);
}

// node-postgres and drizzle-kit truncate usernames at the first dot when
// parsing a connection string (e.g. Supabase pooler: postgres.PROJECT_REF).
// Re-encode the username so the dot survives URL parsing.
function fixSupabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    // Re-encode username — dots must become %2E
    const user = decodeURIComponent(u.username).replace(/\./g, "%2E");
    const pass = encodeURIComponent(decodeURIComponent(u.password));
    return `postgresql://${user}:${pass}@${u.host}${u.pathname}?sslmode=require`;
  } catch {
    return url;
  }
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: provider === "replit" ? rawUrl : fixSupabaseUrl(rawUrl),
  },
});
