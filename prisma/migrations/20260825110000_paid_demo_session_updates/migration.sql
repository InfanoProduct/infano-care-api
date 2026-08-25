-- AlterTable
ALTER TABLE "DemoSession" ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL DEFAULT 29,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "razorpayOrderId" TEXT,
ADD COLUMN     "razorpayPaymentId" TEXT,
ADD COLUMN     "razorpaySignature" TEXT,
ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DemoSession_razorpayOrderId_key" ON "DemoSession"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "DemoSession_userId_idx" ON "DemoSession"("userId");

-- CreateIndex
CREATE INDEX "DemoSession_phone_idx" ON "DemoSession"("phone");

-- AddForeignKey
ALTER TABLE "DemoSession" ADD CONSTRAINT "DemoSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
