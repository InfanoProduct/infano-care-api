import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.development' });
dotenv.config({ path: '.env.local', override: true });

async function check() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  await client.connect();
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'User';
  `);
  const cols = res.rows.map(r => r.column_name);
  if (!cols.includes('fcmToken')) {
    console.log('fcmToken is MISSING. Adding it now...');
    await client.query('ALTER TABLE "public"."User" ADD COLUMN "fcmToken" TEXT;');
    console.log('fcmToken added SUCCESSFULLY');
  } else {
    console.log('fcmToken already exists.');
  }
  await client.end();
}

check().catch(console.error);
