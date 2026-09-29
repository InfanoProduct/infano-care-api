-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paypalOrderId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paypalCaptureId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Order_paypalOrderId_key" ON "Order"("paypalOrderId");
