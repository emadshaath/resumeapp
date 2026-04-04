#!/usr/bin/env node

/**
 * Run Supabase migrations via the Management API.
 * This script reads all SQL files from supabase/migrations/ and executes them
 * against the Supabase database using the pg REST endpoint.
 *
 * Required env vars:
 *   SUPABASE_DB_URL - Postgres connection string (from Supabase dashboard > Settings > Database)
 *
 * This runs as part of the Vercel build process.
 * It tracks applied migrations in a _migrations table to avoid re-running.
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const DB_URL = process.env.SUPABASE_DB_URL;

if (!DB_URL) {
  console.log("⏭️  SUPABASE_DB_URL not set — skipping migrations");
  process.exit(0);
}

async function query(sql) {
  // Use the Supabase Postgres HTTP API (pg_graphql is not needed)
  // We'll use the native postgres driver via fetch to the Supabase REST endpoint
  // Actually, for Vercel builds we need a simpler approach — use supabase-js rpc

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  // Use Supabase's pg_net or direct REST — but for DDL we need the SQL editor API
  // Supabase Management API: POST /v1/projects/{ref}/database/query
  const projectRef = url.replace("https://", "").split(".")[0];

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Migration query failed (${response.status}): ${text}`);
  }

  return response.json();
}

async function main() {
  console.log("🔄 Running Supabase migrations...");

  // Ensure migration tracking table exists
  await query(`
    CREATE TABLE IF NOT EXISTS public._migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  // Get already-applied migrations
  const applied = await query(`SELECT name FROM public._migrations ORDER BY name;`);
  const appliedSet = new Set((applied || []).map((r) => r.name));

  // Read migration files
  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  let files;
  try {
    files = await readdir(migrationsDir);
  } catch {
    console.log("📁 No migrations directory found — skipping");
    process.exit(0);
  }

  const sqlFiles = files.filter((f) => f.endsWith(".sql")).sort();

  let applied_count = 0;
  for (const file of sqlFiles) {
    if (appliedSet.has(file)) {
      console.log(`  ✓ ${file} (already applied)`);
      continue;
    }

    console.log(`  ▸ Applying ${file}...`);
    const sql = await readFile(join(migrationsDir, file), "utf-8");

    try {
      await query(sql);
      await query(
        `INSERT INTO public._migrations (name) VALUES ('${file}');`
      );
      applied_count++;
      console.log(`  ✓ ${file} applied`);
    } catch (err) {
      console.error(`  ✗ ${file} failed:`, err.message);
      process.exit(1);
    }
  }

  if (applied_count === 0) {
    console.log("✅ All migrations already applied");
  } else {
    console.log(`✅ Applied ${applied_count} migration(s)`);
  }
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
