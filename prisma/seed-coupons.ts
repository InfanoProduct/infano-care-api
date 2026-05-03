import { PrismaClient, CouponType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const coupons = [
    {
      code: "INFANO10",
      type: CouponType.PERCENTAGE,
      value: 10,
      minOrderAmount: 400,
      maxDiscount: 100,
      isActive: true,
    },
    {
      code: "WELCOME50",
      type: CouponType.FLAT,
      value: 50,
      minOrderAmount: 200,
      isActive: true,
    },
  ];

  for (const coupon of coupons) {
    await prisma.discountCoupon.upsert({
      where: { code: coupon.code },
      update: coupon,
      create: coupon,
    });
  }
  
  console.log("Seeded coupons:", coupons.map(c => c.code));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
