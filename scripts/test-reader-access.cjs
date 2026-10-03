const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const book = await prisma.book.findFirst({ where: { format: 'DIGITAL_EBOOK' } });
  const ent = await prisma.userBookEntitlement.findFirst({ where: { userId: admin.id, bookId: book.id } });

  console.log('Sanity Check:', {
    adminId: admin.id,
    bookSlug: book.slug,
    entitlement: ent ? { id: ent.id, source: ent.source } : null,
    chaptersCount: Array.isArray(book.chapters) ? book.chapters.length : typeof book.chapters
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
