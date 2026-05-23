const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  await prisma.discountCoupon.deleteMany({});
  console.log('All existing discount coupons deleted successfully.');
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
