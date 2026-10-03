const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const books = await prisma.book.findMany();
  console.log('ALL BOOKS:', JSON.stringify(books, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
