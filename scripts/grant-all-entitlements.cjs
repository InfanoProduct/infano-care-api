const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const digitalBook = await prisma.book.findFirst({
    where: { format: 'DIGITAL_EBOOK' }
  });

  if (!digitalBook) {
    console.error('No digital book found in DB!');
    return;
  }

  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users in DB. Granting access to digital book ${digitalBook.id}...`);

  for (const user of users) {
    await prisma.userBookEntitlement.upsert({
      where: {
        userId_bookId: {
          userId: user.id,
          bookId: digitalBook.id
        }
      },
      create: {
        userId: user.id,
        bookId: digitalBook.id,
        source: 'grant_all',
        lastReadPage: 1,
        progressPercent: 0.0
      },
      update: {}
    });
  }

  console.log('SUCCESS: All users granted digital book entitlement!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
