import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getMenstrualData(phone: string) {
  const user = await prisma.user.findUnique({
    where: { phone },
    include: {
      cycleProfile: true,
      cycleLogs: {
        orderBy: { date: 'desc' },
        take: 10
      },
      cycleRecords: {
        orderBy: { startDate: 'desc' },
        take: 5
      }
    }
  });

  if (!user) {
    console.log(`User with phone number ${phone} not found.`);
    return;
  }

  console.log(JSON.stringify(user, null, 2));
}

const phone = '+919742802062';
getMenstrualData(phone)
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
