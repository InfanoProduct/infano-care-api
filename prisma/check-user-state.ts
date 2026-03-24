import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const phone = '+911234567890';
  const user = await prisma.user.findUnique({
    where: { phone },
    include: {
      profile: true,
      personalization: true,
      avatar: true,
      cycleProfile: true,
      progress: true
    }
  })
  console.log(JSON.stringify(user, null, 2))
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
