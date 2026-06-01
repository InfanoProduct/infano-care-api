import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Removing all linkages for teen phone: 1234567890...");
  
  const teen = await prisma.user.findUnique({ where: { phone: "1234567890" } });
  
  let deletedCount = 0;

  // 1. Delete all links where receiverPhone is "1234567890"
  const result1 = await prisma.parentLink.deleteMany({
    where: { receiverPhone: "1234567890" }
  });
  deletedCount += result1.count;
  console.log(`Deleted ${result1.count} links where receiverPhone was 1234567890.`);

  if (teen) {
    console.log(`Found teen user with ID: ${teen.id}`);
    
    // 2. Delete all links where teenId is the teen's ID
    const result2 = await prisma.parentLink.deleteMany({
      where: { teenId: teen.id }
    });
    deletedCount += result2.count;
    console.log(`Deleted ${result2.count} links where teenId matched the user ID.`);
    
    // 3. Delete all links where parentId is the teen's ID (in case of misconfiguration)
    const result3 = await prisma.parentLink.deleteMany({
      where: { parentId: teen.id }
    });
    deletedCount += result3.count;
    console.log(`Deleted ${result3.count} links where parentId matched the user ID.`);
  } else {
    console.log("Teen user not found in the DB (might only exist as an invite).");
  }

  console.log(`Total linkages successfully removed: ${deletedCount}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    console.log("Done.");
  });
