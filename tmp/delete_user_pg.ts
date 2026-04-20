import pg from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const phone = process.argv[2];
  if (!phone) {
    console.error('Usage: ts-node delete_user_pg.ts <phone_number>');
    return;
  }

  let dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    const envFile = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('DATABASE_URL=')) {
          dbUrl = line.split('=')[1].trim();
          // Remove quotes if any
          dbUrl = dbUrl.replace(/^["'](.+)["']$/, '$1');
          console.log('Loaded DATABASE_URL from .env.local');
          break;
        }
      }
    }
  }

  if (!dbUrl) {
    console.error('DATABASE_URL not found');
    return;
  }

  const client = new pg.Client({
    connectionString: dbUrl,
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    // Find the user first
    const findRes = await client.query(
      'SELECT id, phone FROM "User" WHERE phone = $1 OR phone = $2 OR phone = $3',
      [phone, `+91${phone}`, `91${phone}`]
    );

    if (findRes.rows.length === 0) {
      console.log('No user found with phone:', phone);
      return;
    }

    for (const user of findRes.rows) {
      const userId = user.id;
      console.log(`Deleting user ${userId} with phone ${user.phone}...`);

      await client.query('BEGIN');

      try {
        // Manually delete relations that don't have ON DELETE CASCADE in schema
        // (Checking schema.prisma for ones without onDelete: Cascade)
        await client.query('DELETE FROM "CycleLog" WHERE "userId" = $1', [userId]);
        await client.query('DELETE FROM "UserQuest" WHERE "userId" = $1', [userId]);
        await client.query('DELETE FROM "UserBadge" WHERE "userId" = $1', [userId]);
        await client.query('DELETE FROM "Subscription" WHERE "userId" = $1', [userId]);

        // Now delete the user (others should cascade if DB constraints are set, 
        // but we can be explicit for the main ones to be sure)
        // Profile, UserAvatar, CycleProfile, etc. have onDelete: Cascade in the schema.
        
        await client.query('DELETE FROM "User" WHERE id = $1', [userId]);

        await client.query('COMMIT');
        console.log(`Successfully deleted user ${userId}.`);
      } catch (e) {
        await client.query('ROLLBACK');
        console.error(`Failed to delete user ${userId}:`, e);
      }
    }
  } catch (err) {
    console.error('Database connection error:', err);
  } finally {
    await client.end();
  }
}

main();
