import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding webinar product...');
  
  const webinarProduct = await prisma.book.upsert({
    where: { id: 'webinar-decoding-silence' },
    update: {
      title: 'Decoding Her Silence: Parent Webinar',
      description: "What's Really Going On Behind Your Daughter's Mood Swings, Screen Time & Silence — and What To Do About It. A Rs. 99 Value-First Webinar for Parents of Adolescent Girls (Grades 5–9).",
      price: 99.0,
      stock: 99999,
      isActive: true,
      imageUrl: '/webinar-banner.png'
    },
    create: {
      id: 'webinar-decoding-silence',
      title: 'Decoding Her Silence: Parent Webinar',
      description: "What's Really Going On Behind Your Daughter's Mood Swings, Screen Time & Silence — and What To Do About It. A Rs. 99 Value-First Webinar for Parents of Adolescent Girls (Grades 5–9).",
      price: 99.0,
      stock: 99999,
      isActive: true,
      imageUrl: '/webinar-banner.png'
    }
  });

  console.log(`Seeded/Updated webinar product: ${webinarProduct.title}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
