import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const inputArgs = process.argv.slice(2);
  let phones = inputArgs.length > 0 ? inputArgs : ['+917209536820', '+911234567890'];

  // Normalize all phones to e.164 (+91 format)
  phones = phones.map(p => {
    let normalized = p;
    if (!normalized.startsWith('+91')) {
      normalized = normalized.startsWith('91') ? '+' + normalized : '+91' + normalized.replace(/^\+/, '');
    }
    return normalized;
  });

  for (const phone of phones) {
    console.log(`Resetting user with phone: ${phone}`)

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
      console.log(`User with phone ${phone} not found. Creating a fresh test user...`)
      await prisma.user.create({
        data: {
          phone,
          isTestNumber: true,
          accountStatus: 'PENDING_SETUP',
          onboardingStep: 1,
        }
      });
      console.log(`Test user ${phone} created successfully.`);
      continue
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
        onboardingStep: 1,
        onboardingCompletedAt: null,
        termsAcceptedAt: null,
        privacyAcceptedAt: null,
        marketingOptIn: false,
        coppaConsentRequired: false,
        coppaConsentGranted: null,
        coppaConsentAt: null,
        parentEmail: null,
        isTestNumber: true,
      }
    })

    console.log(`User ${phone} successfully reset (test flag preserved).`)
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
