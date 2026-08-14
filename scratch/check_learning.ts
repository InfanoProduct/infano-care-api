import { prisma } from '../src/db/client.js';

async function check() {
  const journeys = await prisma.learningJourney.findMany({
    include: {
      episodes: true
    }
  });

  console.log(`\n========================================`);
  console.log(`TOTAL JOURNEYS IN DB: ${journeys.length}`);
  console.log(`========================================\n`);

  for (const j of journeys) {
    console.log(`📚 JOURNEY: "${j.title}"`);
    console.log(`   - ID: ${j.id}`);
    console.log(`   - Slug: ${j.slug}`);
    console.log(`   - Age Band: ${j.ageBand ?? 'All'}`);
    console.log(`   - Category: ${j.category ?? 'General'}`);
    console.log(`   - Total XP: ${j.totalXP}`);
    console.log(`   - Active: ${j.isActive}`);
    console.log(`   - Premium: ${j.isPremium}`);
    console.log(`   - Total Episodes: ${j.episodes.length}`);

    for (const ep of j.episodes) {
      console.log(`\n   🎬 EPISODE ${ep.order + 1}: "${ep.title}"`);
      console.log(`      - ID: ${ep.id}`);
      console.log(`      - Slug: ${ep.slug}`);
      console.log(`      - Points: ${ep.points}`);
      console.log(`      - Premium: ${ep.isPremium}`);
      console.log(`      - Content Type: ${typeof ep.content}`);
      
      const contentStr = JSON.stringify(ep.content);
      console.log(`      - Content Payload Length: ${contentStr.length} chars`);
      console.log(`      - Content Sample: ${contentStr.slice(0, 200)}...`);
    }
    console.log(`----------------------------------------`);
  }

  await prisma.$disconnect();
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
