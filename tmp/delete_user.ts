import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const phone = process.argv[2];
  if (!phone) {
    console.error('Usage: ts-node delete_user.ts <phone_number>');
    return;
  }

  // Manually load .env.local if DATABASE_URL is not set
  if (!process.env.DATABASE_URL) {
    const envFile = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.startsWith('DATABASE_URL=')) {
          process.env.DATABASE_URL = line.split('=')[1].trim();
          console.log('Loaded DATABASE_URL from .env.local');
          break;
        }
      }
    }
  }

  if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL not found in environment or .env.local');
      return;
  }

  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    // Try matching with and without +91
    const targets = await prisma.user.findMany({
      where: {
        OR: [
          { phone: phone },
          { phone: `+91${phone}` },
          { phone: `91${phone}` }
        ]
      }
    });

    if (targets.length === 0) {
      console.log('No user found with phone:', phone);
      return;
    }

    for (const user of targets) {
      console.log('Deleting user:', user.id, 'phone:', user.phone);
      await prisma.user.delete({ where: { id: user.id } });
    }
    console.log('Deletion successful.');
  } catch (err: any) {
    console.error('Error detail:', JSON.stringify(err, null, 2));
    console.error('Stack:', err.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
