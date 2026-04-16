import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed: Creating community events and challenges...');

  // 1. Weekly Challenge
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);

  await prisma.weeklyChallenge.create({
    data: {
      theme: '7 Days of Self-Care',
      description: 'Join us this week to practice small daily acts of kindness for yourself.',
      startDate: now,
      endDate: nextWeek,
      promptsByCircle: {}, // Required by schema
    },
  });

  // 2. Events
  const events = [
    {
      title: 'Introduction to Mood Journaling',
      description: 'Learn how to express your feelings through creative writing.',
      imageUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=800',
      startDate: new Date(Date.now() + 86400000 * 2),
      endDate: new Date(Date.now() + 86400000 * 2 + 3600000),
      isOnline: true,
      link: 'https://meet.google.com/abc-defg-hij',
      attendeeCount: 12,
    },
    {
      title: 'Expert Q&A: Understanding Changes',
      description: 'A safe space to ask our health experts anything.',
      imageUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=800',
      startDate: new Date(Date.now() + 86400000 * 4),
      endDate: new Date(Date.now() + 86400000 * 4 + 7200000),
      isOnline: true,
      link: 'https://meet.google.com/xyz-uvwx-yza',
      attendeeCount: 45,
    },
  ];

  for (const event of events) {
    await prisma.communityEvent.create({
      data: event,
    });
  }

  console.log('Seed: Community data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
