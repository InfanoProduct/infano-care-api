import { prisma } from '../src/db/client.js';

async function main() {
  console.log('Querying all programs in DB...');
  const programs = await prisma.program.findMany();
  console.log('Programs count:', programs.length);
  programs.forEach(p => {
    console.log(`ID: "${p.id}", Title: "${p.title}", classRange: "${p.classRange}", isActive: ${p.isActive}`);
  });
  
  // Test case-insensitive lookup
  const lookup = await prisma.program.findFirst({
    where: {
      title: {
        equals: 'spark',
        mode: 'insensitive'
      }
    }
  });
  console.log('\nLookup result for "spark":', lookup ? `FOUND ID: ${lookup.id}` : 'NOT FOUND');
}

main().catch(console.error).finally(() => prisma.$disconnect());
