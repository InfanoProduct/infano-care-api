import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const parentPhone = "+917209536820";
  const teenPhone = "+911234567890";

  // 1. Find the parent
  const parent = await prisma.user.findUnique({ where: { phone: parentPhone } });
  if (!parent) {
    console.error(`Parent with phone ${parentPhone} not found`);
    return;
  }

  // 2. Find the teen
  const teen = await prisma.user.findUnique({ where: { phone: teenPhone } });
  if (!teen) {
    console.error(`Teen with phone ${teenPhone} not found`);
    return;
  }

  // 3. Delete all existing links for this parent
  const deletedLinks = await prisma.parentLink.deleteMany({
    where: {
      OR: [
        { parentId: parent.id },
        { senderId: parent.id }
      ]
    }
  });
  console.log(`Deleted ${deletedLinks.count} existing links for parent ${parentPhone}`);

  // 4. Delete all existing links for this teen
  const deletedTeenLinks = await prisma.parentLink.deleteMany({
    where: {
      OR: [
        { teenId: teen.id },
        { receiverPhone: "1234567890" } // bypass case
      ]
    }
  });
  console.log(`Deleted ${deletedTeenLinks.count} existing links for teen ${teenPhone}`);

  // 5. Create the new bypassed active link
  const newLink = await prisma.parentLink.create({
    data: {
      parentId: parent.id,
      teenId: teen.id,
      senderId: parent.id,
      receiverPhone: teenPhone.replace("+91", ""),
      status: "LINKED"
    }
  });

  console.log("Successfully created active link:", newLink);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
