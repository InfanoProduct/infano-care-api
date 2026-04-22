import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function clearLocks() {
  const p = await prisma.profile.update({
    where: { userId: '1112223333' },
    data: { 
      pendingSafetyCheckin: false, 
      unavailableUntil: null 
    }
  });
  console.log('Locks cleared for mentor:', p.userId);
}

clearLocks().finally(() => prisma.$disconnect());
