import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = 'Admin@Infano.Care';
  const password = 'infanocare1@3';
  const phone = '+910000000001'; // Unique placeholder phone
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log(`[Seed] Seeding admin user: ${username}`);

  // First, check if the phone is already taken by another user
  const phoneUser = await prisma.user.findUnique({ where: { phone } });
  if (phoneUser && phoneUser.username !== username) {
    console.log(`[Warning] Phone ${phone} is already taken by user: ${phoneUser.username}.`);
    console.log(`Using a random phone number instead.`);
  }

  const user = await prisma.user.upsert({
    where: { username },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
    },
    create: {
      username,
      password: hashedPassword,
      phone: phoneUser && phoneUser.username !== username ? `+91${Math.floor(1000000000 + Math.random() * 9000000000)}` : phone,
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
    },
  });

  // Ensure they have a profile
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      displayName: 'System Admin',
    },
    create: {
      userId: user.id,
      displayName: 'System Admin',
    }
  });

  console.log(`[Seed] Admin user seeded successfully.`);
  console.log(`-----------------------------------`);
  console.log(`Username: ${username}`);
  console.log(`Password: ${password}`);
  console.log(`-----------------------------------`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
