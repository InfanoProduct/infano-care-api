import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { username: 'infano@admin.com' },
  });

  if (user) {
    console.log('Admin user found:');
    console.log('ID:', user.id);
    console.log('Username:', user.username);
    console.log('Role:', user.role);
    console.log('Role type:', typeof user.role);
  } else {
    console.log('Admin user not found.');
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
