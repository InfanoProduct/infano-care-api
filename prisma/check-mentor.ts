import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const username = 'mentor@peerline.com';
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, role: true, accountStatus: true, password: true }
  });

  if (user) {
    console.log('User found:', JSON.stringify(user, null, 2));
    console.log('Has password:', !!user.password);
  } else {
    console.log('User not found');
    const allWithUsernames = await prisma.user.findMany({
      where: { NOT: { username: null } },
      select: { username: true }
    });
    console.log('Users with usernames:', allWithUsernames);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
