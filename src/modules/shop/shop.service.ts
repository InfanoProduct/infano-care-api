import { prisma } from "../../db/client.js";
import Razorpay from "razorpay";
import { env } from "../../config/env.js";
import crypto from "crypto";
import { PaymentMethod, PaymentStatus, OrderStatus, CouponType } from "@prisma/client";

const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID || "",
  key_secret: env.RAZORPAY_KEY_SECRET || "",
});

const GST_RATE = 0.05; // 5% for books

export class ShopService {
  static async getBooks() {
    return prisma.book.findMany({
      where: { isActive: true },
      include: { coupon: true },
    });
  }

  static async getBook(id: string) {
    return prisma.book.findUnique({
      where: { id },
      include: { coupon: true },
    });
  }

  static async validateCoupon(code: string, items: { bookId: string; quantity: number; price: number }[]) {
    const coupon = await prisma.discountCoupon.findUnique({
      where: { code, isActive: true },
      include: { book: true },
    });

    if (!coupon) throw new Error("Invalid or inactive coupon");
    if (coupon.expiryDate && coupon.expiryDate < new Date()) throw new Error("Coupon has expired");
    if (coupon.usedCount >= coupon.usageLimit) throw new Error("Coupon usage limit reached");

    // Filter items to see if this coupon is applicable
    let applicableItems = items;
    if (coupon.book) {
      applicableItems = items.filter(item => item.bookId === coupon.book!.id);
      if (applicableItems.length === 0) {
        throw new Error("This promo code is not applicable to the items in your cart");
      }
    }

    const applicableSubtotal = applicableItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const totalSubtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    if (totalSubtotal < coupon.minOrderAmount) {
      throw new Error(`Minimum order amount for this coupon is ₹${coupon.minOrderAmount}`);
    }

    let discount = 0;
    if (coupon.type === CouponType.PERCENTAGE) {
      discount = (applicableSubtotal * coupon.value) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    } else {
      discount = coupon.value;
      // Flat discount shouldn't exceed applicable items price
      discount = Math.min(discount, applicableSubtotal);
    }

    return { coupon, discountAmount: Math.round(discount) };
  }

  static async createOrder(data: {
    userId?: string;
    guestEmail?: string;
    guestName?: string;
    guestPhone?: string;
    shippingAddress: string;
    city: string;
    state: string;
    pincode: string;
    paymentMethod: PaymentMethod;
    items: { bookId: string; quantity: number }[];
    couponCode?: string;
    gstNumber?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      // 1. Calculate subtotal and verify stock
      let subtotal = 0;
      const orderItems = [];

      for (const item of data.items) {
        const book = await tx.book.findUnique({ where: { id: item.bookId } });
        if (!book) throw new Error(`Book not found: ${item.bookId}`);
        if (book.stock < item.quantity) throw new Error(`Out of stock: ${book.title}`);

        subtotal += book.price * item.quantity;
        orderItems.push({
          bookId: item.bookId,
          quantity: item.quantity,
          price: book.price,
        });
      }

      // 2. Handle Discount
      let discountAmount = 0;
      let couponId = null;
      if (data.couponCode) {
        const { coupon, discountAmount: calculatedDiscount } = await this.validateCoupon(data.couponCode, orderItems);
        discountAmount = calculatedDiscount;
        couponId = coupon.id;
        
        // Increment coupon usage
        await tx.discountCoupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } }
        });
      }

      // 3. Calculate GST and Total (Production Grade Reverse Calculation)
      const taxableSubtotal = subtotal - discountAmount;
      const deliveryCharge = 0; // Free delivery for all orders
      
      // Reverse GST calculation: Price = Taxable + (Taxable * Rate) => Taxable = Price / (1 + Rate)
      const taxableAmount = Math.round((taxableSubtotal / (1 + GST_RATE)) * 100) / 100;
      const gstAmount = Math.round((taxableSubtotal - taxableAmount) * 100) / 100;
      const cgstAmount = Math.round((gstAmount / 2) * 100) / 100;
      const sgstAmount = Math.round((gstAmount / 2) * 100) / 100;
      
      const totalAmount = taxableSubtotal + deliveryCharge;

      // 4. Create Razorpay order if needed
      let razorpayOrderId = null;
      if (data.paymentMethod === PaymentMethod.ONLINE) {
        const options = {
          amount: Math.round(totalAmount * 100),
          currency: "INR",
          receipt: `rcpt_${Date.now()}`,
        };
        const rpOrder = await razorpay.orders.create(options);
        razorpayOrderId = rpOrder.id;
      }

      // 5. Create Order record
      const order = await tx.order.create({
        data: {
          userId: data.userId,
          guestEmail: data.guestEmail,
          guestName: data.guestName,
          guestPhone: data.guestPhone,
          subtotal,
          taxableAmount,
          cgstAmount,
          sgstAmount,
          gstAmount,
          deliveryCharge,
          discountAmount,
          totalAmount,
          paymentMethod: data.paymentMethod,
          shippingAddress: data.shippingAddress,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          razorpayOrderId,
          couponId,
          gstNumber: data.gstNumber,
          items: {
            create: orderItems,
          },
        },
        include: { items: { include: { book: true } } }
      });

      // 6. Reduce stock immediately (will rollback if transaction fails)
      for (const item of orderItems) {
        await tx.book.update({
          where: { id: item.bookId },
          data: { stock: { decrement: item.quantity } }
        });
      }

      return order;
    });
  }

  static async verifyPayment(data: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = data;
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET || "")
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpaySignature) {
      return prisma.order.update({
        where: { razorpayOrderId },
        data: {
          paymentStatus: PaymentStatus.COMPLETED,
          razorpayPaymentId,
          razorpaySignature,
        },
      });
    } else {
      await prisma.order.update({
        where: { razorpayOrderId },
        data: { paymentStatus: PaymentStatus.FAILED }
      });
      throw new Error("Payment verification failed: Invalid signature");
    }
  }

  static isValidTransition(current: OrderStatus, next: OrderStatus): boolean {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PLACED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };
    return transitions[current].includes(next);
  }

  static async updateStatus(id: string, nextStatus: OrderStatus) {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new Error("Order not found");

    if (!this.isValidTransition(order.orderStatus, nextStatus)) {
      throw new Error(`Invalid status transition from ${order.orderStatus} to ${nextStatus}`);
    }

    // If cancelled, restore stock
    if (nextStatus === OrderStatus.CANCELLED) {
      const items = await prisma.orderItem.findMany({ where: { orderId: id } });
      await prisma.$transaction(async (tx) => {
        for (const item of items) {
          await tx.book.update({
            where: { id: item.bookId },
            data: { stock: { increment: item.quantity } }
          });
        }
        await tx.order.update({
          where: { id },
          data: { orderStatus: nextStatus }
        });
      });
    } else {
      return prisma.order.update({
        where: { id },
        data: { orderStatus: nextStatus }
      });
    }
  }

  static async handleWebhook(body: string, signature: string) {
    const expectedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET || "")
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      throw new Error("Invalid webhook signature");
    }

    const event = JSON.parse(body);

    if (event.event === "order.paid") {
      const { id: razorpayOrderId } = event.payload.order.entity;
      const { id: razorpayPaymentId } = event.payload.payment.entity;

      await prisma.order.update({
        where: { razorpayOrderId },
        data: {
          paymentStatus: PaymentStatus.COMPLETED,
          razorpayPaymentId,
        },
      });
    } else if (event.event === "payment.failed") {
      const { order_id: razorpayOrderId } = event.payload.payment.entity;
      
      await prisma.order.update({
        where: { razorpayOrderId },
        data: { paymentStatus: PaymentStatus.FAILED }
      });
    }

    return { received: true };
  }

  // ─── Admin Coupon Methods ────────────────────────────────────────────

  static async adminListCoupons() {
    return prisma.discountCoupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { orders: true } } },
    });
  }

  static async adminCreateCoupon(data: {
    code: string;
    type: CouponType;
    value: number;
    minOrderAmount?: number;
    maxDiscount?: number;
    expiryDate?: string | null;
    usageLimit?: number;
    isActive?: boolean;
  }) {
    return prisma.discountCoupon.create({
      data: {
        code: data.code.toUpperCase().trim(),
        type: data.type,
        value: data.value,
        minOrderAmount: data.minOrderAmount ?? 0,
        maxDiscount: data.maxDiscount ?? null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        usageLimit: data.usageLimit ?? 100,
        isActive: data.isActive ?? true,
      },
    });
  }

  static async adminUpdateCoupon(id: string, data: Partial<{
    code: string;
    type: CouponType;
    value: number;
    minOrderAmount: number;
    maxDiscount: number | null;
    expiryDate: string | null;
    usageLimit: number;
    isActive: boolean;
  }>) {
    return prisma.discountCoupon.update({
      where: { id },
      data: {
        ...data,
        code: data.code ? data.code.toUpperCase().trim() : undefined,
        expiryDate: data.expiryDate !== undefined
          ? (data.expiryDate ? new Date(data.expiryDate) : null)
          : undefined,
      },
    });
  }

  static async adminDeleteCoupon(id: string) {
    return prisma.discountCoupon.delete({ where: { id } });
  }
}
