import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });
dotenv.config({ path: '.env.local', override: true });

const prisma = new PrismaClient();

async function dump() {
  const phone = '+919669341348';
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    console.log('User not found');
    return;
  }

  const profile = await prisma.cycleProfile.findUnique({ where: { userId: user.id } });
  const logs = await prisma.cycleLog.findMany({ 
    where: { userId: user.id },
    orderBy: { date: 'desc' },
    take: 10
  });
  const records = await prisma.cycleRecord.findMany({ 
    where: { userId: user.id },
    orderBy: { startDate: 'desc' }
  });

  console.log('--- PROFILE ---');
  console.log(JSON.stringify(profile, null, 2));
  console.log('\n--- RECENT LOGS ---');
  logs.forEach(l => console.log(`${l.date.toISOString().split('T')[0]} | flow: ${l.flow}`));
  console.log('\n--- RECORDS ---');
  records.forEach(r => {
    console.log(`Cycle #${r.cycleNumber} | Complete: ${r.isComplete} | Start: ${r.startDate.toISOString().split('T')[0]} | Period: ${r.periodStartDate.toISOString().split('T')[0]} to ${r.periodEndDate?.toISOString().split('T')[0]} | End: ${r.endDate?.toISOString().split('T')[0]}`);
  });

  await prisma.$disconnect();
}

dump().catch(console.error);
