import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const phone = '+911234567890';
  await prisma.user.update({
    where: { phone },
    data: {
      otpRetryCount: 0,
      otpSendOn: null,
    },
  });
  console.log(`Reset OTP rate limit for ${phone}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
