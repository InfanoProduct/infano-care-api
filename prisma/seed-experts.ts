import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const experts = [
  { name: 'Dr. Sarah Jones', specialisation: 'Gynaecologist', email: 'gynaecologist@infano.care', phone: '+12345678901' },
  { name: 'Dr. Michael Chen', specialisation: 'Psychologist', email: 'psychologist@infano.care', phone: '+12345678902' },
  { name: 'Priya Sharma', specialisation: 'Nutritionist', email: 'nutritionist@infano.care', phone: '+12345678903' },
  { name: 'Dr. Emily White', specialisation: 'Dermatologist', email: 'dermatologist@infano.care', phone: '+12345678904' },
  { name: 'David Lee', specialisation: 'Career counselor', email: 'career.counselor@infano.care', phone: '+12345678905' },
  { name: 'Amanda Green', specialisation: 'Financial Advisor', email: 'financial.advisor@infano.care', phone: '+12345678906' },
  { name: 'Robert Clark', specialisation: 'Advocate', email: 'advocate@infano.care', phone: '+12345678907' }
];

async function main() {
  console.log('Seeding experts...');
  for (const expert of experts) {
    const user = await prisma.user.upsert({
      where: { email: expert.email },
      update: {
        role: UserRole.EXPERT,
        profile: {
          update: {
            displayName: expert.name,
            specialisation: expert.specialisation,
          }
        }
      },
      create: {
        email: expert.email,
        phone: expert.phone,
        username: expert.specialisation.replace(/\s+/g, '').toLowerCase() + '123',
        role: UserRole.EXPERT,
        accountStatus: 'ACTIVE',
        profile: {
          create: {
            displayName: expert.name,
            specialisation: expert.specialisation,
            isAvailable: true,
            consultationPrice: 500,
            bio: `Experienced ${expert.specialisation} ready to help.`
          }
        }
      }
    });
    console.log(`Created/Updated expert: ${expert.name} (${expert.specialisation})`);
  }
  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
