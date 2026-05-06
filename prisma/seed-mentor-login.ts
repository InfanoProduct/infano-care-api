import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = 'mentor@peerline.com';
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log(`[Seed] Creating mentor user: ${username}`);

  const user = await prisma.user.upsert({
    where: { username },
    update: {
      password: hashedPassword,
      role: 'EXPERT',
      accountStatus: 'ACTIVE',
    },
    create: {
      username,
      password: hashedPassword,
      phone: '+919998887776', // Dummy phone
      role: 'EXPERT',
      accountStatus: 'ACTIVE',
      profile: {
        create: {
          displayName: 'Certified Mentor',
          mentorStatus: 'certified',
          isAvailable: true,
        }
      }
    },
  });

  console.log(`[Seed] Mentor user created successfully.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
