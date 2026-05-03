import { prisma } from "../../db/client.js";
import Razorpay from "razorpay";
import { env } from "../../config/env.js";
import crypto from "crypto";
import { PaymentMethod, PaymentStatus, OrderStatus } from "@prisma/client";

const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID || "",
  key_secret: env.RAZORPAY_KEY_SECRET || "",
});

export class ShopService {
  static async getBooks() {
    return prisma.book.findMany({
      where: { isActive: true },
    });
  }

  static async getBook(id: string) {
    return prisma.book.findUnique({
      where: { id },
    });
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
  }) {
    // 1. Calculate total amount
    let totalAmount = 0;
    const orderItems = [];

    for (const item of data.items) {
      const book = await prisma.book.findUnique({ where: { id: item.bookId } });
      if (!book) throw new Error(`Book with id ${item.bookId} not found`);
      if (book.stock < item.quantity) throw new Error(`Not enough stock for book: ${book.title}`);

      totalAmount += book.price * item.quantity;
      orderItems.push({
        bookId: item.bookId,
        quantity: item.quantity,
        price: book.price,
      });
    }

    // 2. Create Razorpay order if method is ONLINE
    let razorpayOrderId = null;
    if (data.paymentMethod === PaymentMethod.ONLINE) {
      const options = {
        amount: Math.round(totalAmount * 100), // Amount in paise
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      };

      const rpOrder = await razorpay.orders.create(options);
      razorpayOrderId = rpOrder.id;
    }

    // 3. Create order in DB
    const order = await prisma.order.create({
      data: {
        userId: data.userId,
        guestEmail: data.guestEmail,
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        totalAmount,
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentMethod === PaymentMethod.COD ? PaymentStatus.PENDING : PaymentStatus.PENDING,
        orderStatus: OrderStatus.PLACED,
        shippingAddress: data.shippingAddress,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        razorpayOrderId,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            book: true,
          },
        },
      },
    });

    return order;
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
      // Payment verified
      const order = await prisma.order.update({
        where: { razorpayOrderId },
        data: {
          paymentStatus: PaymentStatus.COMPLETED,
          razorpayPaymentId,
          razorpaySignature,
        },
      });

      // Update stock
      const orderWithItems = await prisma.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      });

      if (orderWithItems) {
        for (const item of orderWithItems.items) {
          await prisma.book.update({
            where: { id: item.bookId },
            data: {
              stock: { decrement: item.quantity },
            },
          });
        }
      }

      return order;
    } else {
      throw new Error("Invalid signature");
    }
  }

  static async handleWebhook(payload: string, signature: string) {
    const isValid = Razorpay.validateWebhookSignature(
      payload,
      signature,
      env.RAZORPAY_WEBHOOK_SECRET || ""
    );

    if (!isValid) {
      throw new Error("Invalid webhook signature");
    }

    const event = JSON.parse(payload);
    const razorpayOrderId = event.payload.payment.entity.order_id;

    if (event.event === "payment.captured") {
      await prisma.order.update({
        where: { razorpayOrderId },
        data: {
          paymentStatus: PaymentStatus.COMPLETED,
          razorpayPaymentId: event.payload.payment.entity.id,
        },
      });
    } else if (event.event === "payment.failed") {
      await prisma.order.update({
        where: { razorpayOrderId },
        data: {
          paymentStatus: PaymentStatus.FAILED,
        },
      });
    }

    return { status: "ok" };
  }
}
