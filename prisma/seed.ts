import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const phone = '+917209536820' // The number from the logs
  const user = await prisma.user.upsert({
    where: { phone },
    update: { isTestNumber: false },
    create: {
      phone,
      isTestNumber: false, // Disabling test number for real OTP testing
      accountStatus: 'PENDING_SETUP'
    },
  })
  console.log({ user })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
