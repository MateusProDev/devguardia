const { Client } = require('pg');

async function migrate() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Check if old SUBSCRIPTION value exists in the PaymentType enum
  const r = await client.query(
    "SELECT EXISTS(SELECT 1 FROM pg_enum WHERE enumlabel = 'SUBSCRIPTION' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PaymentType'))"
  );

  if (r.rows[0].exists) {
    console.log('[MIGRATE] Found old SUBSCRIPTION enum value, migrating data...');

    // Add new enum values
    for (const v of ['SUBSCRIPTION_STARTER', 'SUBSCRIPTION_PRO', 'SUBSCRIPTION_ENTERPRISE']) {
      try {
        await client.query(`ALTER TYPE "PaymentType" ADD VALUE IF NOT EXISTS '${v}'`);
        console.log(`[MIGRATE] Added enum value: ${v}`);
      } catch (e) {
        console.log(`[MIGRATE] Enum value already exists: ${v}`);
      }
    }

    // Convert existing SUBSCRIPTION records to SUBSCRIPTION_STARTER
    const updated = await client.query(
      "UPDATE \"Payment\" SET type = 'SUBSCRIPTION_STARTER' WHERE type = 'SUBSCRIPTION'"
    );
    console.log(`[MIGRATE] Converted ${updated.rowCount} payments from SUBSCRIPTION to SUBSCRIPTION_STARTER`);
  } else {
    console.log('[MIGRATE] No old SUBSCRIPTION enum found, skipping data migration');
  }

  await client.end();
  console.log('[MIGRATE] Data migration complete');
}

migrate().catch((e) => {
  console.error('[MIGRATE] Error:', e.message);
  process.exit(1);
});
