import { prisma } from "../../db/client.js";
import Razorpay from "razorpay";
import { env } from "../../config/env.js";
import crypto from "crypto";
import { PaymentMethod, PaymentStatus, OrderStatus, CouponType } from "@prisma/client";
import { normalizePhone } from "../../common/utils/phone.js";

const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID || "",
  key_secret: env.RAZORPAY_KEY_SECRET || "",
});

const GST_RATE = 0.05; // 5% for books

export class ShopService {
  static async getBooks() {
    const books = await prisma.book.findMany({
      where: {
        isActive: true,
        NOT: [
          { id: { endsWith: "-private" } },
          { id: { endsWith: "-group" } }
        ]
      },
    });
    const coupon = await prisma.discountCoupon.findFirst({
      orderBy: { createdAt: "desc" },
    });
    return books.map(book => ({ ...book, coupon }));
  }

  static async getBook(id: string) {
    const book = await prisma.book.findUnique({
      where: { id },
    });
    if (!book) return null;
    const coupon = await prisma.discountCoupon.findFirst({
      orderBy: { createdAt: "desc" },
    });
    return { ...book, coupon };
  }

  static async validateCoupon(code: string, amount: number) {
    const coupon = await prisma.discountCoupon.findUnique({
      where: { code, isActive: true },
    });

    if (!coupon) throw new Error("Invalid or inactive coupon");
    if (coupon.expiryDate && coupon.expiryDate < new Date()) throw new Error("Coupon has expired");
    if (coupon.usedCount >= coupon.usageLimit) throw new Error("Coupon usage limit reached");
    if (amount < coupon.minOrderAmount) throw new Error(`Minimum order amount for this coupon is ₹${coupon.minOrderAmount}`);

    let discount = 0;
    if (coupon.type === CouponType.PERCENTAGE) {
      discount = (amount * coupon.value) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    } else {
      discount = coupon.value;
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
        const { coupon, discountAmount: calculatedDiscount } = await this.validateCoupon(data.couponCode, subtotal);
        discountAmount = calculatedDiscount;
        couponId = coupon.id;

        // For COD, increment coupon immediately. For ONLINE, increment upon successful payment
        if (data.paymentMethod === PaymentMethod.COD) {
          await tx.discountCoupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } }
          });
        }
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
          orderStatus: data.paymentMethod === PaymentMethod.COD ? OrderStatus.PLACED : OrderStatus.PLACED,
          gstNumber: data.gstNumber,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: true,
        }
      });

      // 6. Update User Profile if userId is present (as requested)
      if (data.userId) {
        const updateData: any = {
          profile: {
            upsert: {
              create: { displayName: data.guestName || "User" },
              update: { displayName: data.guestName },
            }
          }
        };

        if (data.guestEmail) {
          const emailExists = await tx.user.findFirst({
            where: {
              email: data.guestEmail,
              id: { not: data.userId }
            }
          });
          if (!emailExists) {
            updateData.email = data.guestEmail;
          }
        }

        await tx.user.update({
          where: { id: data.userId },
          data: updateData
        });
      }

      // 7. Manage Inventory
      if (data.paymentMethod === PaymentMethod.COD) {
        for (const item of orderItems) {
          await tx.book.update({
            where: { id: item.bookId },
            data: { stock: { decrement: item.quantity } }
          });
        }
      }

      return order;
    }, {
      timeout: 20000
    });
  }

  static async completeOrder(razorpayOrderId: string, razorpayPaymentId?: string, razorpaySignature?: string) {
    const order = await prisma.order.findUnique({
      where: { razorpayOrderId },
      include: { items: { include: { book: true } } }
    });
    if (!order) return null;

    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      return order; // already completed
    }

    // 1. Find or create user from guestPhone if userId is missing
    let userId = order.userId;
    if (!userId && order.guestPhone) {
      const normalized = normalizePhone(order.guestPhone);
      let user = await prisma.user.findUnique({ where: { phone: normalized } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            phone: normalized,
            accountStatus: "PENDING_SETUP",
            onboardingStep: 1,
            role: "PARENT",
            profile: {
              create: {
                displayName: order.guestName || "Parent",
                totalPoints: 0,
              }
            }
          }
        });
      }
      userId = user.id;
    }

    // Update order status to COMPLETED
    const updatedOrder = await prisma.order.update({
      where: { razorpayOrderId },
      data: {
        paymentStatus: PaymentStatus.COMPLETED,
        razorpayPaymentId,
        razorpaySignature,
        userId: userId || undefined,
      },
    });

    // 2. Process Inventory and Coupon usage for successful Online payments
    if (order.paymentMethod === PaymentMethod.ONLINE) {
      for (const item of order.items) {
        await prisma.book.update({
          where: { id: item.bookId },
          data: { stock: { decrement: item.quantity } }
        });
      }

      if (order.couponId) {
        await prisma.discountCoupon.update({
          where: { id: order.couponId },
          data: { usedCount: { increment: 1 } }
        });
      }
    }

    // 2. Automatically create program enrollment if ordered item is a program
    if (userId) {
      for (const item of order.items) {
        const book = item.book as any;
        if (!book) continue;
        const isProg = book.id.endsWith("-private") || book.id.endsWith("-group");
        if (isProg) {
          const programTitle = book.id.split("-")[0].toUpperCase();
          const program = await prisma.program.findFirst({
            where: { title: { equals: programTitle, mode: "insensitive" } }
          });
          if (program) {
            const type = (item.book as any).id.endsWith("-private") ? "PRIVATE" : "GROUP";
            // Check if already enrolled
            const existingEnrollment = await prisma.programEnrollment.findUnique({
              where: {
                userId_programId: {
                  userId,
                  programId: program.id
                }
              }
            });
            if (!existingEnrollment) {
              await prisma.programEnrollment.create({
                data: {
                  userId,
                  programId: program.id,
                  type,
                  pricePaid: item.price,
                  status: "ACTIVE",
                  guestName: order.guestName,
                  guestEmail: order.guestEmail,
                }
              });
            }
          }
        }
      }
    }

    return updatedOrder;
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
      return await this.completeOrder(razorpayOrderId, razorpayPaymentId, razorpaySignature);
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
      return await prisma.$transaction(async (tx) => {
        for (const item of items) {
          await tx.book.update({
            where: { id: item.bookId },
            data: { stock: { increment: item.quantity } }
          });
        }
        return await tx.order.update({
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

      await this.completeOrder(razorpayOrderId, razorpayPaymentId);
    } else if (event.event === "payment.failed") {
      const { order_id: razorpayOrderId } = event.payload.payment.entity;

      await prisma.order.update({
        where: { razorpayOrderId },
        data: { paymentStatus: PaymentStatus.FAILED }
      });
    }

    return { received: true };
  }

  static async getUserOrders(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            book: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  static async adminListCoupons() {
    return prisma.discountCoupon.findMany({
      orderBy: { createdAt: "desc" }
    });
  }

  static async adminCreateCoupon(data: any) {
    return prisma.discountCoupon.create({
      data: {
        code: data.code,
        type: data.type,
        value: Number(data.value),
        minOrderAmount: Number(data.minOrderAmount ?? 0),
        maxDiscount: data.maxDiscount ? Number(data.maxDiscount) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        usageLimit: Number(data.usageLimit ?? 100),
        isActive: data.isActive ?? true,
      }
    });
  }

  static async adminUpdateCoupon(id: string, data: any) {
    return prisma.discountCoupon.update({
      where: { id },
      data: {
        code: data.code,
        type: data.type,
        value: data.value !== undefined ? Number(data.value) : undefined,
        minOrderAmount: data.minOrderAmount !== undefined ? Number(data.minOrderAmount) : undefined,
        maxDiscount: data.maxDiscount !== undefined ? (data.maxDiscount ? Number(data.maxDiscount) : null) : undefined,
        expiryDate: data.expiryDate !== undefined ? (data.expiryDate ? new Date(data.expiryDate) : null) : undefined,
        usageLimit: data.usageLimit !== undefined ? Number(data.usageLimit) : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      }
    });
  }

  static async adminDeleteCoupon(id: string) {
    return prisma.discountCoupon.delete({
      where: { id }
    });
  }

  static async adminGetRazorpayTransactions(options: { skip?: number; count?: number; from?: number; to?: number }) {
    return razorpay.payments.all(options);
  }
}
