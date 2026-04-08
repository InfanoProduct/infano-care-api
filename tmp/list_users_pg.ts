import pg from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  let dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    const envFile = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('DATABASE_URL=')) {
          dbUrl = line.split('=')[1].trim();
          dbUrl = dbUrl.replace(/^["'](.+)["']$/, '$1');
          break;
        }
      }
    }
  }

  const client = new pg.Client({ connectionString: dbUrl });
  try {
    await client.connect();
    const res = await client.query('SELECT phone FROM "User" LIMIT 20');
    console.log('User phones in DB:', res.rows.map(u => u.phone));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
main();
