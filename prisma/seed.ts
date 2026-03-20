import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const testNumbers = [
    { phone: '+917209536820', isTestNumber: false }, // Existing one
    { phone: '+911234567890', isTestNumber: true }   // New test number
  ]

  for (const item of testNumbers) {
    const user = await prisma.user.upsert({
      where: { phone: item.phone },
      update: { isTestNumber: item.isTestNumber },
      create: {
        phone: item.phone,
        isTestNumber: item.isTestNumber,
        accountStatus: 'PENDING_SETUP'
      },
    })
    console.log(`Upserted user: ${user.phone}, isTestNumber: ${user.isTestNumber}`)
  }
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
