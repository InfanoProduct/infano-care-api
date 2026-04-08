import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });
dotenv.config({ path: '.env.local', override: true });

const prisma = new PrismaClient();

async function sanitize() {
  const phone = '+919669341348';
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    console.log('User not found');
    return;
  }

  const records = await prisma.cycleRecord.findMany({ 
    where: { userId: user.id },
    orderBy: { cycleNumber: 'asc' }
  });

  console.log(`Found ${records.length} records for user ${phone}. Sanitizing...`);

  for (const r of records) {
    let newEndDate: Date | null = null;
    
    if (r.cycleNumber === 1) newEndDate = new Date('2026-02-06T23:59:59.999Z');
    if (r.cycleNumber === 2) newEndDate = new Date('2026-03-06T23:59:59.999Z');
    if (r.cycleNumber === 3) newEndDate = new Date('2026-04-03T23:59:59.999Z');

    if (newEndDate) {
      console.log(`Updating Cycle #${r.cycleNumber}: endDate set to ${newEndDate.toISOString().split('T')[0]}`);
      await prisma.cycleRecord.update({
        where: { id: r.id },
        data: {
          endDate: newEndDate,
          cycleLengthDays: 28, // Seeded cycles were all 28 days
          isComplete: true
        }
      });
    }
  }

  console.log('Sanitization COMPLETE.');
  await prisma.$disconnect();
}

sanitize().catch(console.error);
