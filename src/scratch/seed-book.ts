import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const book = await prisma.book.create({
    data: {
      title: 'The Awkward Age',
      description: 'A story of Every Adolescent Girl',
      price: 499,
      stock: 100,
      isActive: true,
      imageUrl: '/girl-standing-with-book.png'
    }
  });
  console.log('Book seeded:', book);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
