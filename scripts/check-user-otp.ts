import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkUser(phone: string) {
  const user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, phone: true, isTestNumber: true, otpRetryCount: true, otpSendOn: true }
  });
  console.log('User status:', JSON.stringify(user, null, 2));
}

const phone = process.argv[2] || '+917209536820';
checkUser(phone).then(() => prisma.$disconnect());
