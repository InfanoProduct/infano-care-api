-- AlterTable
ALTER TABLE "Order" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Program" DROP COLUMN "priceGroup",
DROP COLUMN "pricePrivate",
DROP COLUMN "sessions",
ADD COLUMN "price" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProgramEnrollment" DROP COLUMN "type";
