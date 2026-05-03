import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = 'infano@admin.com';
  const password = 'infano@admin.com';
  const phone = '+919999999999'; 

  console.log(`Creating specific admin user: ${username}`);

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { username },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
    },
    create: {
      username,
      password: hashedPassword,
      phone,
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
      onboardingStep: 13,
    },
  });

  console.log(`Admin user ${admin.username} created successfully with requested password.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
