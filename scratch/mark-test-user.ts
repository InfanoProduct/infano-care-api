import { prisma } from "../src/db/client.js";

async function main() {
  const phone = "+917209536820";
  
  // Find or create the user
  const user = await prisma.user.upsert({
    where: { phone },
    update: {
      isTestNumber: true
    },
    create: {
      phone,
      isTestNumber: true,
      accountStatus: "PENDING_SETUP",
      onboardingStep: 1,
      profile: {
        create: {
          displayName: "Test User",
          totalPoints: 0
        }
      }
    }
  });
  
  console.log("Successfully marked user as test user in DB:", user);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
