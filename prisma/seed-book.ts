import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const book = await prisma.book.create({
    data: {
      title: "Growing Up Honest",
      description: "Written with warmth, honesty, and deep respect for adolescent girls, the Infano book is a comprehensive guide to growing up — addressing the questions that don't make it into school textbooks or family dinners.",
      price: 499,
      stock: 100,
      imageUrl: "https://infano.care/book-cover.png",
      isActive: true,
    },
  });
  console.log("Created book:", book);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
