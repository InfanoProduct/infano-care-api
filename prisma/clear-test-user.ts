import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const phone = '+911234567890'
  console.log(`Clearing data for user with phone: ${phone}`)

  const user = await prisma.user.findUnique({
    where: { phone },
    include: {
      cycleLogs: true,
      progress: true,
      userQuests: true,
      userBadges: true,
      subscription: true
    }
  })

  if (!user) {
    console.log(`User with phone ${phone} not found. Running seed to ensure it exists.`)
    return
  }

  // Delete non-cascading relations
  await prisma.cycleLog.deleteMany({ where: { userId: user.id } })
  await prisma.userProgress.deleteMany({ where: { userId: user.id } })
  await prisma.userQuest.deleteMany({ where: { userId: user.id } })
  await prisma.userBadge.deleteMany({ where: { userId: user.id } })
  await prisma.subscription.delete({ where: { userId: user.id } }).catch(() => {}) // Might not exist

  // Delete the user (will cascade to Profile, PersonalizationProfile, UserAvatar, etc.)
  await prisma.user.delete({ where: { id: user.id } })

  console.log(`User ${phone} and all associated data cleared.`)
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
