import pg from 'pg';
const { Client } = pg;

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres:DevPassword123!@109.199.120.104:5432/infano_dev?schema=public"
  });
  try {
    console.log("Connecting...");
    await client.connect();
    console.log("Connected!");
    
    console.log("Adding history column to UserProgress...");
    await client.query('ALTER TABLE "UserProgress" ADD COLUMN IF NOT EXISTS "history" JSONB;');
    console.log("Column added successfully!");

  } catch (err) {
    console.error("Error", err);
  } finally {
    await client.end();
  }
}

main();
