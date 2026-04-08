import { prisma } from '../src/db/client.js';

async function main() {
  const phone = '+919669341348';
  try {
    const user = await prisma.user.findUnique({
      where: { phone },
      include: {
        cycleProfile: true,
        cycleLogs: {
          orderBy: { date: 'desc' },
          take: 5
        },
        cycleRecords: {
          orderBy: { startDate: 'desc' },
          take: 3
        }
      }
    });

    if (!user) {
      console.log(JSON.stringify({ error: 'User not found' }));
      return;
    }

    console.log(JSON.stringify(user, null, 2));
  } catch (error) {
    console.error('Error fetching user data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
