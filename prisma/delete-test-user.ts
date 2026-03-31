import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const inputArgs = process.argv.slice(2);
  if (inputArgs.length === 0) {
    console.error('Error: Please provide a phone number. Example: npm run delete-test-user 1234567890');
    process.exit(1);
  }

  let phone = inputArgs[0];
  if (!phone.startsWith('+91')) {
    phone = phone.startsWith('91') ? '+' + phone : '+91' + phone.replace(/^\+/, '');
  }

  console.log(`Deleting user: ${phone}...`)

  const user = await prisma.user.findUnique({ where: { phone } })

  if (!user) {
    console.error(`Error: User ${phone} not found!`);
    return;
  }

  // Delete non-cascading relations
  console.log('Deleting non-cascading relations...')
  await prisma.cycleLog.deleteMany({ where: { userId: user.id } })
  await prisma.userProgress.deleteMany({ where: { userId: user.id } })
  await prisma.userQuest.deleteMany({ where: { userId: user.id } })
  await prisma.userBadge.deleteMany({ where: { userId: user.id } })
  await prisma.subscription.delete({ where: { userId: user.id } }).catch(() => {}) 
  await prisma.consentRequest.deleteMany({ where: { userId: user.id } }).catch(() => {})

  // Delete the user (this covers Profile, UserAvatar, CycleProfile, PersonalizationProfile via Cascade)
  console.log('Deleting User record (triggers Cascade)...')
  await prisma.user.delete({ where: { id: user.id } })

  console.log(`User ${phone} successfully deleted.`);
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
