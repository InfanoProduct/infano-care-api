import { PrismaClient, CouponType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.discountCoupon.upsert({
    where: { code: 'PROMO15' },
    update: {
      type: CouponType.PERCENTAGE,
      value: 15,
      isActive: true,
    },
    create: {
      code: 'PROMO15',
      type: CouponType.PERCENTAGE,
      value: 15,
      isActive: true,
    }
  });
  console.log('Coupon created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
