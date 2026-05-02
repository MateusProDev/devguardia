#!/bin/sh
set -e

echo "[MIGRATE] Converting old SUBSCRIPTION values to SUBSCRIPTION_STARTER..."

# Extract host, port, dbname, user, password from DATABASE_URL
# Format: postgresql://user:pass@host:port/dbname?params
DB_URL="$DATABASE_URL"

# Use node to run the migration SQL since node is available
node -e "
const { Client } = require('pg');
async function migrate() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  // Check if old SUBSCRIPTION value exists in enum
  const enumCheck = await client.query(
    \"SELECT EXISTS(SELECT 1 FROM pg_enum WHERE enumlabel = 'SUBSCRIPTION' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PaymentType'))\"
  );
  
  if (enumCheck.rows[0].exists) {
    console.log('[MIGRATE] Found old SUBSCRIPTION enum value, migrating...');
    
    // Add new enum values if they don't exist
    const newValues = ['SUBSCRIPTION_STARTER', 'SUBSCRIPTION_PRO', 'SUBSCRIPTION_ENTERPRISE'];
    for (const val of newValues) {
      try {
        await client.query(\`ALTER TYPE \"PaymentType\" ADD VALUE IF NOT EXISTS '\${val}'\`);
        console.log('[MIGRATE] Added enum value: ' + val);
      } catch (e) {
        console.log('[MIGRATE] Enum value already exists: ' + val);
      }
    }
    
    // Update existing records
    await client.query(\"UPDATE \\\"Payment\\\" SET type = 'SUBSCRIPTION_STARTER' WHERE type = 'SUBSCRIPTION'\");
    console.log('[MIGRATE] Updated existing SUBSCRIPTION payments to SUBSCRIPTION_STARTER');
  } else {
    console.log('[MIGRATE] No old SUBSCRIPTION enum value found, skipping data migration');
  }
  
  // Check if ScanIntensity enum exists, if not the new columns aren't there yet
  const intensityCheck = await client.query(
    \"SELECT EXISTS(SELECT 1 FROM pg_type WHERE typname = 'ScanIntensity')\"
  );
  
  if (!intensityCheck.rows[0].exists) {
    console.log('[MIGRATE] ScanIntensity enum not found, will be created by prisma db push');
  }
  
  await client.end();
  console.log('[MIGRATE] Data migration complete');
}
migrate().catch(e => { console.error('[MIGRATE] Error:', e.message); process.exit(1); });
"

echo "[MIGRATE] Running prisma db push..."
npx prisma db push --accept-data-loss --skip-generate

echo "[MIGRATE] Done!"
