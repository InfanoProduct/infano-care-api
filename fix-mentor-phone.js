import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixStep() {
  const mentor = await prisma.user.findUnique({ where: { phone: '+911112223333' } });
  if (!mentor) { console.log('❌ Mentor not found'); await prisma.$disconnect(); return; }

  await prisma.user.update({
    where: { id: mentor.id },
    data: { onboardingStep: 13 }
  });

  console.log('✅ Set onboardingStep to 13 (matches router check)');
  await prisma.$disconnect();
}

fixStep();
