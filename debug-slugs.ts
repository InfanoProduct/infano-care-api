import { prisma } from './src/db/client.js';

async function debugSlugs() {
  console.log('Fetching all slugs...');
  try {
    const posts = await prisma.blogPost.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        isDeleted: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${posts.length} posts.`);
    posts.forEach(p => {
      console.log(`- Slug: "${p.slug}", Title: "${p.title}", Deleted: ${p.isDeleted}, ID: ${p.id}`);
    });

    const categories = await prisma.blogCategory.findMany({
      select: { id: true, name: true, slug: true }
    });
    console.log(`\nFound ${categories.length} categories.`);
    categories.forEach(c => {
      console.log(`- Slug: "${c.slug}", Name: "${c.name}", ID: ${c.id}`);
    });

  } catch (error) {
    console.error('Error debugging slugs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSlugs();
