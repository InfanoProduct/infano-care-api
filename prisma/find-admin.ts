import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (admin) {
    console.log('Admin Username:', admin.username);
    console.log('Admin Email:', admin.email);
    console.log('Note: Password is hashed in the database.');
  } else {
    console.log('No ADMIN user found in the database.');
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
