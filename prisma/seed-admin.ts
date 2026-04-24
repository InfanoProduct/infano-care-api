import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = 'infano@admin.com';
  const password = 'Infano@2026';
  const phone = '+910000000000'; // Placeholder for required phone field

  console.log(`Seeding admin user: ${username}`);

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
      onboardingStep: 13, // Fully onboarded
    },
  });

  console.log(`Admin user ${admin.username} seeded successfully.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
