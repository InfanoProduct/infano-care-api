import { prisma } from "../src/db/client.js";

interface TestUserConfig {
  phone: string;
  parentName: string;
  learnerName: string;
  learnerAge: string;
}

const testAccounts: TestUserConfig[] = [
  // 1. Valid-format Indian mobile numbers starting with 9
  {
    phone: "+919000000001",
    parentName: "Test Parent 1",
    learnerName: "Aanya",
    learnerAge: "11",
  },
  {
    phone: "+919000000002",
    parentName: "Test Parent 2",
    learnerName: "Diya",
    learnerAge: "12",
  },
  {
    phone: "+919000000003",
    parentName: "Test Parent 3",
    learnerName: "Rhea",
    learnerAge: "10",
  },
  // 2. Exact requested numbers (+91 00000 00001..3)
  {
    phone: "+910000000001",
    parentName: "Test Parent 01",
    learnerName: "Aanya",
    learnerAge: "11",
  },
  {
    phone: "+910000000002",
    parentName: "Test Parent 02",
    learnerName: "Diya",
    learnerAge: "12",
  },
  {
    phone: "+910000000003",
    parentName: "Test Parent 03",
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
