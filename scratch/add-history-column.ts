import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.development' });
dotenv.config({ path: '.env.local', override: true });

const { Client } = pg;

async function runSql() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database to add "history" column...');
    
    // Check if column exists first
    const checkRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='UserProgress' AND column_name='history';
    `);

    if (checkRes.rowCount === 0) {
      console.log('Adding "history" column to "UserProgress" table...');
      await client.query('ALTER TABLE "UserProgress" ADD COLUMN "history" JSONB;');
      console.log('Column added successfully.');
    } else {
      console.log('Column "history" already exists.');
    }

  } catch (error) {
    console.error('Error running SQL:', error);
  } finally {
    await client.end();
  }
}

runSql();
