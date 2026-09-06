const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.error('DATABASE_URL is required. Add the Supabase pooled Postgres connection string to .env.local.');
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(databaseUrl);
} catch {
  console.error('DATABASE_URL must be a valid postgres:// or postgresql:// URL.');
  process.exit(1);
}

if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
  console.error('DATABASE_URL must use the postgres:// or postgresql:// protocol.');
  process.exit(1);
}

console.log(`Database connection configured for ${parsed.hostname}.`);
