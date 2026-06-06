import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Test the exact query the fixed code will use
  const user = await prisma.user.findFirst({
    where: { username: { equals: 'admin@infano.care', mode: 'insensitive' } },
    select: { id: true, username: true, role: true }
  });
  console.log('Case-insensitive lookup for "admin@infano.care":');
  console.log(user ? `FOUND: ${JSON.stringify(user)}` : 'NOT FOUND');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
