import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const inputArgs = process.argv.slice(2);
  if (inputArgs.length === 0) {
    console.error('Error: Please provide a phone number. Example: npm run reset-test-user 1234567890');
    process.exit(1);
  }

  let phone = inputArgs[0];
  if (!phone.startsWith('+91')) {
    phone = phone.startsWith('91') ? '+' + phone : '+91' + phone.replace(/^\+/, '');
  }

  console.log(`Resetting user: ${phone}...`)

  const user = await prisma.user.findUnique({ where: { phone } })

  if (!user) {
    console.error(`Error: User ${phone} not found! Use 'npm run create-test-user ${inputArgs[0]}' first.`);
    return;
  }

  // Delete non-cascading relations
  await prisma.cycleLog.deleteMany({ where: { userId: user.id } })
  await prisma.userProgress.deleteMany({ where: { userId: user.id } })
  await prisma.userQuest.deleteMany({ where: { userId: user.id } })
  await prisma.userBadge.deleteMany({ where: { userId: user.id } })
  await prisma.subscription.delete({ where: { userId: user.id } }).catch(() => {}) 
  await prisma.consentRequest.deleteMany({ where: { userId: user.id } }).catch(() => {})

  // Clear 1-to-1 profiles
  await prisma.profile.delete({ where: { userId: user.id } }).catch(() => {})
  await prisma.userAvatar.delete({ where: { userId: user.id } }).catch(() => {})
  await prisma.cycleProfile.delete({ where: { userId: user.id } }).catch(() => {})
  await prisma.personalizationProfile.delete({ where: { userId: user.id } }).catch(() => {})

  // Reset the user record
  await prisma.user.update({
    where: { id: user.id },
    data: {
      otpSendOn: null,
      otpRetryCount: 0,
      birthMonth: null,
      birthYear: null,
      ageAtSignup: null,
      contentTier: null,
      accountStatus: "PENDING_SETUP",
      onboardingStep: 0,
      onboardingCompletedAt: null,
      termsAcceptedAt: null,
      privacyAcceptedAt: null,
      marketingOptIn: false,
      coppaConsentRequired: false,
      coppaConsentGranted: null,
      coppaConsentAt: null,
      parentEmail: null,
      isTestNumber: true, // guarantee they stay a test number
    }
  })

  console.log(`User ${phone} successfully reset to Stage 1.`);
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
