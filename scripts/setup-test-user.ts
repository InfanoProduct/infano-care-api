import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const phone = '+911234567890';

  // Upsert: create the user if they don't exist, or update isTestNumber if they do
  const user = await prisma.user.upsert({
    where: { phone },
    update: {
      isTestNumber: true,
      otpRetryCount: 0,
      otpSendOn: null,
    },
    create: {
      phone,
      isTestNumber: true,
      accountStatus: 'PENDING_SETUP',
      onboardingStep: 1,
      profile: {
        create: {
          displayName: '',
          totalPoints: 0,
        },
      },
    },
  });

  console.log(`✅ Test user ready:`);
  console.log(`   Phone: ${phone}`);
  console.log(`   ID: ${user.id}`);
  console.log(`   isTestNumber: ${user.isTestNumber}`);
  console.log(`\n   Login with phone: +911234567890`);
  console.log(`   Any OTP will work (e.g. 1234)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
