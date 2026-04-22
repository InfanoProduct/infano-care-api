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
    
    const tables = ['LearningJourney', 'Episode', 'UserProgress', 'Profile'];
    for (const table of tables) {
      console.log(`\nChecking ${table} columns...`);
      const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1;
      `, [table]);
      console.log(`${table} Columns:`, res.rows.map(r => r.column_name));
    }

  } catch (err) {
    console.error("Error", err);
  } finally {
    await client.end();
  }
}

main();
