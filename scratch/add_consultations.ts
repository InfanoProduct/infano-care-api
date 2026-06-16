import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.DATABASE_URL;

async function run() {
  if (!connectionString) {
    console.error('DATABASE_URL is not set in environment.');
    process.exit(1);
  }
  
  console.log('Connecting to:', connectionString.split('@')[1] || connectionString);
  const client = new pg.Client({
    connectionString,
  });
  
  try {
    await client.connect();
    console.log('Connected to DB successfully.');
    
    // Add consultations column as JSONB with default value of '[]'
    await client.query('ALTER TABLE "Program" ADD COLUMN IF NOT EXISTS "consultations" JSONB DEFAULT \'[]\';');
    console.log('Successfully added "consultations" column to "Program" table.');
  } catch (err) {
    console.error('Error running SQL command:', err);
  } finally {
    await client.end();
  }
}

run();
