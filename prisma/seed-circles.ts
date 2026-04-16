import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const circles = [
    {
      slug: 'periods-body',
      name: 'Period Talk',
      description: 'Cycles, symptoms, products',
      iconEmoji: '🩸',
      accentColor: '#EF4444',
      sortOrder: 1,
    },
    {
      slug: 'relations-trust',
      name: 'Confidence Corner',
      description: 'Body image, self-esteem',
      iconEmoji: '💪',
      accentColor: '#F59E0B',
      sortOrder: 2,
    },
    {
      slug: 'school-life',
      name: 'Study & Career Lounge',
      description: 'Academic pressure, goals',
      iconEmoji: '📚',
      accentColor: '#3B82F6',
      sortOrder: 3,
    },
    {
      slug: 'mind-space',
      name: 'Mind Space',
      description: 'Mental health, anxiety, support',
      iconEmoji: '🧠',
      accentColor: '#8B5CF6',
      sortOrder: 4,
      requiresPreReview: true,
    },
    {
      slug: 'food-fitness',
      name: 'Nutrition Kitchen',
      description: 'Food, recipes, cycle nutrition',
      iconEmoji: '🥗',
      accentColor: '#10B981',
      sortOrder: 5,
    },
    {
      slug: 'hobbies-creative',
      name: 'Global Girls',
      description: 'Cross-cultural, pen-pal',
      iconEmoji: '🌍',
      accentColor: '#06B6D4',
      sortOrder: 6,
    },
    {
      slug: 'junior_girls',
      name: 'Ages 10–13',
      description: 'Junior safe space (age-verified)',
      iconEmoji: '🌱',
      accentColor: '#10B981',
      isAgeSpecific: true,
      sortOrder: 7,
    },
    {
      slug: 'teen_community',
      name: 'Ages 14–17',
      description: 'Teen community (age-verified)',
      iconEmoji: '🌸',
      accentColor: '#8B5CF6',
      isAgeSpecific: true,
      sortOrder: 8,
    },
    {
      slug: 'young_adults',
      name: 'Ages 18–24',
      description: 'Young adult space (age-verified)',
      iconEmoji: '✨',
      accentColor: '#F59E0B',
      isAgeSpecific: true,
      sortOrder: 9,
    },
  ];

  console.log('Seed: Creating/updating circles...');

  for (const circle of circles) {
    await prisma.communityCircle.upsert({
      where: { slug: circle.slug },
      update: {
        name: circle.name,
        description: circle.description,
        iconEmoji: circle.iconEmoji,
        accentColor: circle.accentColor,
        sortOrder: circle.sortOrder,
        isAgeSpecific: circle.isAgeSpecific,
      },
      create: circle,
    });
  }

  // Delete 'future-me' if it exists to make sure we only have the 6 topic circles and 3 age groups
  try {
    // Delete related posts/reactions first if cascade is not enabled
    // Only attempting safe delete or catching error
    const fmCircle = await prisma.communityCircle.findUnique({ where: { slug: 'future-me' } });
    if (fmCircle) {
      await prisma.communityPost.deleteMany({ where: { circleId: fmCircle.id } }).catch(() => {});
      await prisma.communityCircle.delete({ where: { slug: 'future-me' } }).catch(() => {});
      console.log('Seed: Cleaned up unused future-me circle.');
    }
  } catch (e) {
    console.log('Seed: Could not delete future-me, skipping.');
  }

  console.log('Seed: Circles updated successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
