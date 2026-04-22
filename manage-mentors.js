import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function manageMentors() {
  try {
    console.log("Starting Mentor Seeding cleanup/setup...");

    // 1. Revert 1234567890 (Mentee)
    const menteeUser = await prisma.user.findUnique({ where: { phone: '1234567890' } });
    if (menteeUser) {
      await prisma.profile.update({
        where: { userId: menteeUser.id },
        data: { mentorStatus: 'none', certifiedTopicIds: [] }
      });
      console.log("✅ Reverted 1234567890 to standard user status.");
    }

    // 2. Setup 1112223333 (Mentor)
    const mentorPhone = '+911112223333';
    let mentorUser = await prisma.user.findUnique({ where: { phone: mentorPhone } });
    
    if (!mentorUser) {
      mentorUser = await prisma.user.create({
        data: {
          phone: mentorPhone,
          isTestNumber: true,
          accountStatus: 'ACTIVE',
          role: 'TEEN' // Base role is always TEEN for girls
        }
      });
      console.log(`✅ Created new mentor user with phone ${mentorPhone}`);
    }

    await prisma.profile.upsert({
      where: { userId: mentorUser.id },
      update: {
        mentorStatus: 'certified',
        certifiedTopicIds: ['Mental Health', 'Self-Care', 'Relationships', 'Study Tips', 'Nutrition']
      },
      create: {
        userId: mentorUser.id,
        displayName: 'Mentor Sarah',
        mentorStatus: 'certified',
        certifiedTopicIds: ['Mental Health', 'Self-Care', 'Relationships', 'Study Tips', 'Nutrition']
      }
    });

    console.log(`✅ User ${mentorPhone} is successfully seeded as a Certified Peer Mentor.`);

  } catch (e) {
    console.error("❌ Error managing mentors:", e);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

manageMentors();
