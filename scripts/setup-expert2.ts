import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // 1. Demote previous expert number(s)
    const demoted = await prisma.$executeRawUnsafe(
      `UPDATE "User" SET role = 'TEEN' WHERE phone IN ('1234567890', '+911234567890')`
    );
    console.log(`✅ Removed EXPERT role from old numbers (rows affected: ${demoted})`);

    // 2. Upsert the new expert number using pure raw SQL to avoid enum cache issues
    const newPhone = '+919999999999';

    // Check if user already exists
    const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "User" WHERE phone = $1`, newPhone
    );

    if (existing.length === 0) {
      // Create – insert user with all required fields using raw SQL
      await prisma.$executeRawUnsafe(`
        INSERT INTO "User" (id, phone, role, "isTestNumber", "accountStatus", "onboardingStep", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, 'EXPERT', true, 'ACTIVE', 13, now(), now())
      `, newPhone);

      // Get the newly created id
      const [newUser] = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM "User" WHERE phone = $1`, newPhone
      );

      // Create linked Profile
      await prisma.$executeRawUnsafe(`
        INSERT INTO "Profile" (id, "userId", "displayName", "totalPoints")
        VALUES (gen_random_uuid(), $1, 'Dr. Expert (Test)', 0)
        ON CONFLICT ("userId") DO NOTHING
      `, newUser.id);

      console.log(`✅ Created new EXPERT user for ${newPhone}`);
    } else {
      // Already exists — just promote & mark as test number
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET role = 'EXPERT', "isTestNumber" = true, "accountStatus" = 'ACTIVE', "onboardingStep" = 13 WHERE phone = $1`,
        newPhone
      );
      console.log(`✅ Updated existing user ${newPhone} to EXPERT`);
    }

    console.log(`\n📋 Summary:`);
    console.log(`   Old expert (1234567890) → TEEN`);
    console.log(`   New expert (${newPhone}) → EXPERT`);
    console.log(`   OTP for test number: 1234  (mock mode)`);
  } catch (error) {
    console.error('❌ Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
