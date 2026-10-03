const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const defaultChapters = [
  {
    id: 'ch-1',
    title: 'Chapter 1: The First Spark of Change',
    pageStart: 1,
    pageEnd: 20,
    summary: 'Meet Gigi as she navigates the beginnings of bodily and emotional changes.',
    contentHtml: '<div class="p-6"><h2>Chapter 1: The First Spark of Change</h2><p>Puberty is a symphony of gradual discoveries—hormones orchestrating physical milestones and emotional clarity.</p></div>'
  },
  {
    id: 'ch-2',
    title: 'Chapter 2: Decoding the Biology (Without the Stress)',
    pageStart: 21,
    pageEnd: 45,
    summary: 'A friendly breakdown of the menstrual cycle, hormones, and bodily care.',
    contentHtml: '<div class="p-6"><h2>Chapter 2: Decoding the Biology</h2><p>The menstrual cycle is a natural, healthy biological rhythm controlled by key body hormones.</p></div>'
  },
  {
    id: 'ch-3',
    title: 'Chapter 3: Emotional Harmony & Friendships',
    pageStart: 46,
    pageEnd: 75,
    summary: 'Managing mood swings, peer pressure, and fostering healthy connections.',
    contentHtml: '<div class="p-6"><h2>Chapter 3: Emotional Harmony & Friendships</h2><p>Understanding the brain\'s emotional weather and communication tools.</p></div>'
  },
  {
    id: 'ch-4',
    title: 'Chapter 4: The Parents\' Bridge of Understanding',
    pageStart: 76,
    pageEnd: 100,
    summary: 'How teens and parents communicate openly with mutual trust.',
    contentHtml: '<div class="p-6"><h2>Chapter 4: The Parents\' Bridge of Understanding</h2><p>Practical conversation starters that turn awkward moments into family connection.</p></div>'
  },
  {
    id: 'ch-5',
    title: 'Chapter 5: Stepping Forward with Confidence',
    pageStart: 101,
    pageEnd: 120,
    summary: 'Empowering daily self-care habits and embracing your unique journey.',
    contentHtml: '<div class="p-6"><h2>Chapter 5: Stepping Forward with Confidence</h2><p>Growing up is an adventure to embrace with confidence and self-compassion.</p></div>'
  }
];

async function update() {
  const updated = await prisma.book.update({
    where: { id: '25ea230c-b01b-4a7f-a3f6-eba0ad6a08e9' },
    data: {
      totalPages: 120,
      chapters: defaultChapters
    }
  });
  console.log('SUCCESS: Updated book', updated.id, 'with chapters count:', updated.chapters?.length);
}

update()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
