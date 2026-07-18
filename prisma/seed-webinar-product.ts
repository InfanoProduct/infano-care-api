import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding webinar product...');
  
  // Clean up legacy webinar book products
  const deleteLegacy = await prisma.book.deleteMany({
    where: { id: { startsWith: 'webinar-' } }
  });
  if (deleteLegacy.count > 0) {
    console.log(`Cleaned up ${deleteLegacy.count} legacy webinar book products.`);
  }

  const webinar = await prisma.webinar.upsert({
    where: { id: 'webinar-decoding-silence' },
    update: {
      title: 'Decoding Her Silence: Parent Webinar',
      slug: 'webinar-decoding-silence',
      description: "What's Really Going On Behind Your Daughter's Mood Swings, Screen Time & Silence — and What To Do About It. A Rs. 99 Value-First Webinar for Parents of Adolescent Girls (Grades 5–9).",
      price: 99.0,
      date: new Date("2026-08-01T17:00:00+05:30"),
      zoomLink: "https://zoom.us/j/mock-webinar-id",
      isActive: true,
      mode: 'ONLINE',
      instructor: 'Dr. Deepa'
    },
    create: {
      id: 'webinar-decoding-silence',
      title: 'Decoding Her Silence: Parent Webinar',
      slug: 'webinar-decoding-silence',
      description: "What's Really Going On Behind Your Daughter's Mood Swings, Screen Time & Silence — and What To Do About It. A Rs. 99 Value-First Webinar for Parents of Adolescent Girls (Grades 5–9).",
      price: 99.0,
      date: new Date("2026-08-01T17:00:00+05:30"),
      zoomLink: "https://zoom.us/j/mock-webinar-id",
      isActive: true,
      mode: 'ONLINE',
      instructor: 'Dr. Deepa'
    }
  });

  console.log(`Seeded/Updated webinar: ${webinar.title}`);

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
