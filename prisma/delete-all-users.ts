import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('WARNING: This will delete ALL users and every piece of relational data in the database.')
  console.log('Starting deletion in 3 seconds... (Press Ctrl+C to abort)')
  
  await new Promise(resolve => setTimeout(resolve, 3000))

  console.log('Deleting all relational data...')
  
  // Delete all leaf models
  await prisma.cycleLog.deleteMany()
  await prisma.userProgress.deleteMany()
  await prisma.userQuest.deleteMany()
  await prisma.userBadge.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.consentRequest.deleteMany()

  // Delete 1-to-1 profiles
  await prisma.profile.deleteMany()
  await prisma.userAvatar.deleteMany()
  await prisma.cycleProfile.deleteMany()
  await prisma.personalizationProfile.deleteMany()

  // Finally, delete all users
  console.log('Deleting all User rows...')
  const result = await prisma.user.deleteMany()
  
  console.log(`Successfully deleted ${result.count} users globally.`)
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
