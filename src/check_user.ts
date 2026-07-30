import { prisma } from './db/client';

async function main() {
  const user = await (prisma as any).user.findFirst({
    where: {
      phone: {
        contains: '9742802062',
      },
    },
    include: {
      cycleProfile: true,
    },
  });

  console.log('User found:', JSON.stringify(user, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => (prisma as any).$disconnect());
