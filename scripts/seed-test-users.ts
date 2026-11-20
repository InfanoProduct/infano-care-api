import { prisma } from "../src/db/client.js";

interface TestUserConfig {
  phone: string;
  parentName: string;
  learnerName: string;
  learnerAge: string;
}

const testAccounts: TestUserConfig[] = [
  // Natural-looking 10-digit Indian mobile numbers without continuous zeros
  {
    phone: "+919876543201",
    parentName: "Test Parent 1",
    learnerName: "Aanya",
    learnerAge: "11",
  },
  {
    phone: "+919876543202",
    parentName: "Test Parent 2",
    learnerName: "Diya",
    learnerAge: "12",
  },
  {
    phone: "+919876543203",
    parentName: "Test Parent 3",
    learnerName: "Rhea",
    learnerAge: "10",
  },
];

async function seedTestUsers() {
  console.log("==> Seeding/Updating test users in database...");

  for (const acc of testAccounts) {
    const existing = await prisma.user.findUnique({
      where: { phone: acc.phone },
      include: { learners: true, courseEnrollments: true, profile: true },
    });

    if (existing) {
      console.log(`Updating existing test user ${acc.phone}...`);
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          isTestNumber: true,
          accountStatus: "ACTIVE",
          role: "PARENT",
          onboardingStep: 4,
          onboardingCompletedAt: existing.onboardingCompletedAt || new Date(),
          parentPin: existing.parentPin || "1234",
          parentConsent: true,
          learningStyle: "side_by_side",
          pinAskMode: "always",
        },
      });

      if (!existing.learners || existing.learners.length === 0) {
        await prisma.learnerProfile.create({
          data: {
            parentId: existing.id,
            name: acc.learnerName,
            age: acc.learnerAge,
            periodStatus: "Not yet",
            worries: ["Body changes", "Periods"],
            flowersCount: 1,
            petalsCount: 50,
            streakDays: 1,
          },
        });
      }

      const hasCourse = existing.courseEnrollments?.some(
        (c) => c.courseId === "hernext-foundation" && c.status === "ACTIVE"
      );
      if (!hasCourse) {
        await prisma.courseEnrollment.create({
          data: {
            userId: existing.id,
            courseId: "hernext-foundation",
            status: "ACTIVE",
            pricePaid: 299,
            currency: "INR",
          },
        });
      }

      console.log(`✓ Test user ${acc.phone} updated and ready!`);
    } else {
      console.log(`Creating fresh test user ${acc.phone}...`);
      const created = await prisma.user.create({
        data: {
          phone: acc.phone,
          isTestNumber: true,
          role: "PARENT",
          accountStatus: "ACTIVE",
          onboardingStep: 4,
          onboardingCompletedAt: new Date(),
          parentPin: "1234",
          parentConsent: true,
          learningStyle: "side_by_side",
          pinAskMode: "always",
          marketingOptIn: false,
          profile: {
            create: {
              displayName: acc.parentName,
              totalPoints: 100,
              totalCoins: 20,
              bloomLevel: 1,
              bio: "Test account",
            },
          },
          learners: {
            create: {
              name: acc.learnerName,
              age: acc.learnerAge,
              periodStatus: "Not yet",
              worries: ["Body changes", "Periods"],
              flowersCount: 1,
              petalsCount: 50,
              streakDays: 1,
            },
          },
          courseEnrollments: {
            create: {
              courseId: "hernext-foundation",
              status: "ACTIVE",
              pricePaid: 299,
              currency: "INR",
            },
          },
        },
      });

      console.log(`✓ Test user ${acc.phone} created! ID: ${created.id}`);
    }
  }

  console.log("\n==> ALL TEST USERS CONFIGURED SUCCESSFULLY!");
}

seedTestUsers()
  .catch((e) => {
    console.error("Error seeding test users:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
