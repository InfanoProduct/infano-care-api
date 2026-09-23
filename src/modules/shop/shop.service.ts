import { prisma } from "../../db/client.js";
import Razorpay from "razorpay";
import { env, isProd } from "../../config/env.js";
import crypto from "crypto";
import { logger } from "../../config/logger.js";
import { PaymentMethod, PaymentStatus, OrderStatus, CouponType } from "@prisma/client";
import { normalizePhone } from "../../common/utils/phone.js";
import { sendGigiBookOrderPlacedEmail, sendGigiBookOrderShippedEmail, sendGigiBookOrderDeliveredEmail, sendWebinarConfirmationEmail } from "../../common/services/email.service.js";
import { sendOrderConfirmationWhatsApp, sendOrderShippedWhatsApp, sendOrderDeliveredWhatsApp } from "../../common/services/whatsapp.service.js";
import { v4 as uuidv4 } from "uuid";
import {
  CheckoutPaymentIntent,
  OrderApplicationContextShippingPreference,
  OrderApplicationContextUserAction,
} from "@paypal/paypal-server-sdk";
import { getPaypalOrdersController, getPaypalAccessToken, PAYPAL_API_BASE } from "../../config/paypal.js";
import { verifyPaypalWebhookSignature } from "../../common/utils/paypal-webhook.js";
import { AppError } from "../../common/middleware/errorHandler.js";

const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID || "",
  key_secret: env.RAZORPAY_KEY_SECRET || "",
});

const GST_RATE = 0.05; // 5% for books

// Fast in-memory TTL cache for high-traffic catalog endpoints
const cacheStore = new Map<string, { data: any; expiry: number }>();

function getCached<T>(key: string): T | null {
  const item = cacheStore.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    cacheStore.delete(key);
    return null;
  }
  return item.data as T;
}

function setCached(key: string, data: any, ttlSeconds = 60) {
  cacheStore.set(key, { data, expiry: Date.now() + ttlSeconds * 1000 });
}

export function invalidateShopCache() {
  cacheStore.clear();
}

export class ShopService {
  static async getBooks() {
    const cacheKey = "shop:books:active";
    const cached = getCached<any[]>(cacheKey);
    if (cached) return cached;

    const books = await prisma.book.findMany({
      where: {
        isActive: true,
        NOT: [
          { id: { endsWith: "-private" } },
          { id: { endsWith: "-group" } },
          { id: { startsWith: "webinar-" } }
        ]
      },
    });
    const coupon = await prisma.discountCoupon.findFirst({
      orderBy: { createdAt: "desc" },
    });
    const result = books.map(book => ({ ...book, coupon }));
    setCached(cacheKey, result, 60);
    return result;
  }

  static async getBook(id: string) {
    const cacheKey = `shop:book:${id}`;
    const cached = getCached<any>(cacheKey);
    if (cached) return cached;

    const book = await prisma.book.findUnique({
      where: { id },
    });
    if (!book) return null;
    const coupon = await prisma.discountCoupon.findFirst({
      orderBy: { createdAt: "desc" },
    });
    const result = { ...book, coupon };
    setCached(cacheKey, result, 60);
    return result;
  }

  static async getWebinarBySlug(slug: string) {
    const cacheKey = `shop:webinar:${slug}`;
    const cached = getCached<any>(cacheKey);
    if (cached) return cached;

    let result = null;
    if (slug === 'active') {
      result = await prisma.webinar.findFirst({
        where: { isActive: true },
        orderBy: { date: 'asc' }
      });
    } else {
      result = await prisma.webinar.findFirst({
        where: { slug, isActive: true },
      });
    }
    if (result) {
      setCached(cacheKey, result, 60);
    }
    return result;
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
    comments?: string;
    currency?: string;
    country?: string;
  }) {
    const result = await prisma.$transaction(async (tx) => {
      // Resolve valid userId (checking if the user actually exists in DB to prevent foreign key violation)
      let resolvedUserId: string | undefined = undefined;
      if (data.userId && typeof data.userId === "string" && data.userId.trim() !== "" && data.userId !== "null" && data.userId !== "undefined") {
        const userExists = await tx.user.findUnique({
          where: { id: data.userId }
        });
        if (userExists) {
          resolvedUserId = data.userId;
        }
      }

      // Check if it's a webinar checkout
      let isWebinarCheckout = false;
      let resolvedWebinar = null;

      if (data.items.length === 1 && data.items[0]) {
        const item = data.items[0];
        resolvedWebinar = await tx.webinar.findUnique({
          where: { id: item.bookId }
        });
        if (!resolvedWebinar) {
          resolvedWebinar = await tx.webinar.findUnique({
            where: { slug: item.bookId }
          });
        }
        if (resolvedWebinar || item.bookId.startsWith("webinar-")) {
          isWebinarCheckout = true;
        }
      }

      if (isWebinarCheckout) {
        if (data.items.length !== 1) {
          throw new Error("Webinar registration cannot be combined with other items.");
        }
        const item = data.items[0];
        if (!item) {
          throw new Error("No items in checkout.");
        }
        const webinar = resolvedWebinar || await tx.webinar.findUnique({
          where: { id: item.bookId }
        });
        if (!webinar) {
          throw new Error(`Webinar not found: ${item.bookId}`);
        }
        if (!webinar.isActive) {
          throw new Error(`Webinar is not active: ${webinar.title}`);
        }

        let subtotal = webinar.price;
        let discountAmount = 0;
        let couponId = null;

        if (data.couponCode) {
          const { coupon, discountAmount: calculatedDiscount } = await this.validateCoupon(data.couponCode, subtotal);
          discountAmount = calculatedDiscount;
          couponId = coupon.id;

          // For COD, increment coupon immediately.
          if (data.paymentMethod === PaymentMethod.COD) {
            await tx.discountCoupon.update({
              where: { id: coupon.id },
              data: { usedCount: { increment: 1 } }
            });
          }
        }

        let totalAmount = subtotal - discountAmount;
        if (totalAmount < 0) totalAmount = 0;

        const resolvedCurrency = (data.currency || "INR").toUpperCase();
        let razorpayOrderId = null;
        if (data.paymentMethod === PaymentMethod.ONLINE) {
          const options = {
            amount: Math.round(totalAmount * 100),
            currency: resolvedCurrency,
            receipt: `rcpt_web_${Date.now()}`,
            notes: {
              product_type: "digital_webinar",
              rbi_purpose_code: "P1006",
              webinar_id: webinar.id,
              customer_phone: data.guestPhone || "",
            }
          };
          const rpOrder = await razorpay.orders.create(options);
          razorpayOrderId = rpOrder.id;
        }

        const registrationId = uuidv4();

        const registration = await tx.webinarRegistration.create({
          data: {
            id: registrationId,
            webinarId: webinar.id,
            userId: resolvedUserId,
            guestName: data.guestName,
            guestEmail: data.guestEmail,
            guestPhone: data.guestPhone,
            paymentStatus: data.paymentMethod === PaymentMethod.COD ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
            paymentMethod: data.paymentMethod,
            razorpayOrderId,
            amount: totalAmount,
            currency: resolvedCurrency,
          }
        });

        // Update User Profile if userId is present
        if (resolvedUserId) {
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
                id: { not: resolvedUserId }
              }
            });
            if (!emailExists) {
              updateData.email = data.guestEmail;
            }
          }
          await tx.user.update({
            where: { id: resolvedUserId },
            data: updateData
          });
        }

        return {
          id: registration.id,
          totalAmount: registration.amount,
          currency: resolvedCurrency,
          razorpayOrderId: registration.razorpayOrderId,
          razorpayKeyId: env.RAZORPAY_KEY_ID || "",
          paymentMethod: registration.paymentMethod,
          paymentStatus: registration.paymentStatus,
          createdAt: registration.createdAt,
          updatedAt: registration.updatedAt,
        } as any;
      }

      // Parse country from input or comments
      let country = (data.country || "IN").toUpperCase();
      if (data.comments) {
        try {
          const parsed = JSON.parse(data.comments);
          if (parsed && typeof parsed === "object" && parsed.country) {
            country = String(parsed.country).toUpperCase();
          } else if (typeof parsed === "string") {
            country = parsed.toUpperCase();
          }
        } catch (e) {
          if (typeof data.comments === "string") {
            const cleaned = data.comments.trim().toUpperCase();
            if (cleaned === "US" || cleaned === "UK" || cleaned === "GB" || cleaned === "IN") {
              country = cleaned === "GB" ? "UK" : cleaned;
            }
          }
        }
      }

      const resolvedCurrency = (data.currency || (country === "US" ? "USD" : (country === "UK" || country === "GB") ? "GBP" : "INR")).toUpperCase();
      const isInternational = country === "US" || country === "UK" || country === "GB";

      // Generate order ID
      const orderId = uuidv4();

      // 1. Calculate subtotal and verify stock
      let subtotal = 0;
      const orderItems = [];
      const bookTitles: Record<string, string> = {};
      const bookImageUrls: Record<string, string> = {};

      for (const item of data.items) {
        const book = await tx.book.findUnique({ where: { id: item.bookId } });
        if (!book) throw new Error(`Book not found: ${item.bookId}`);
        if (book.stock < item.quantity) throw new Error(`Out of stock: ${book.title}`);

        bookTitles[item.bookId] = book.title;
        bookImageUrls[item.bookId] = book.imageUrl || "";

        // Apply country-specific pricing from DB; fall back to conversion if not set
        let bookPrice = book.price;
        if (country === "US") {
          bookPrice = (book as any).priceUS != null
            ? (book as any).priceUS
            : Math.round((book.price / 83) * 100) / 100;
        } else if (country === "UK" || country === "GB") {
          bookPrice = (book as any).priceUK != null
            ? (book as any).priceUK
            : Math.round((book.price / 105) * 100) / 100;
        }

        subtotal += bookPrice * item.quantity;
        orderItems.push({
          bookId: item.bookId,
          quantity: item.quantity,
          price: bookPrice,
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

      // 3. Calculate GST and Total
      let taxableSubtotal = subtotal - discountAmount;
      let taxableAmount = taxableSubtotal;
      let cgstAmount = 0;
      let sgstAmount = 0;
      let gstAmount = 0;
      let deliveryCharge = 0;
      let totalAmount = taxableSubtotal;

      // Determine delivery charge from first book's DB settings
      const firstBook = await tx.book.findUnique({ where: { id: data.items[0]?.bookId || "" } });

      if (country === "IN") {
        const baseShipping = (firstBook as any)?.shippingIN ?? 0;
        if (data.paymentMethod === PaymentMethod.COD) {
          const codSurcharge = (firstBook as any)?.codChargeIN ?? 40;
          deliveryCharge = baseShipping + codSurcharge;
        } else {
          deliveryCharge = baseShipping;
        }
        // Reverse GST calculation: Price = Taxable + (Taxable * Rate) => Taxable = Price / (1 + Rate)
        taxableAmount = Math.round((taxableSubtotal / (1 + GST_RATE)) * 100) / 100;
        gstAmount = Math.round((taxableSubtotal - taxableAmount) * 100) / 100;
        cgstAmount = Math.round((gstAmount / 2) * 100) / 100;
        sgstAmount = Math.round((gstAmount / 2) * 100) / 100;
        totalAmount = taxableSubtotal + deliveryCharge;
      } else if (country === "US") {
        deliveryCharge = (firstBook as any)?.shippingUS ?? 0;
        totalAmount = taxableSubtotal + deliveryCharge;
      } else if (country === "UK" || country === "GB") {
        deliveryCharge = (firstBook as any)?.shippingUK ?? 0;
        totalAmount = taxableSubtotal + deliveryCharge;
      } else {
        deliveryCharge = (firstBook as any)?.shippingUS ?? 0;
        totalAmount = taxableSubtotal + deliveryCharge;
      }

      // 4. Create payment gateway order — Razorpay for India, PayPal for US/UK
      let razorpayOrderId: string | null = null;
      let paypalOrderId: string | null = null;

      if (data.paymentMethod === PaymentMethod.ONLINE) {
        const isInternational = country === "US" || country === "UK" || country === "GB";

        if (isInternational) {
          // ── PayPal order (US / UK) ────────────────────────────────────────────
          // Amount must be a string with exactly 2 decimal places per PayPal spec
          const amountStr = (Math.round(totalAmount * 100) / 100).toFixed(2);
          const ordersController = getPaypalOrdersController();

          const countryCode = country === "UK" || country === "GB" ? "GB" : "US";
          const hasUpfrontShipping = Boolean(data.shippingAddress && data.shippingAddress.trim() && data.city && data.state && data.pincode);

          let payer: any = undefined;
          let shipping: any = undefined;

          if (data.guestName || data.guestEmail) {
            const nameParts = (data.guestName || "").trim().split(/\s+/);
            const givenName = nameParts[0] || undefined;
            const surname = nameParts.slice(1).join(" ") || undefined;
            payer = {
              emailAddress: data.guestEmail || undefined,
              name: givenName ? { givenName, surname } : undefined,
            };
          }

          if (hasUpfrontShipping) {
            let adminArea1 = (data.state || "").trim();
            const stateCodeMatch = adminArea1.match(/\(([^)]+)\)/);
            if (stateCodeMatch && stateCodeMatch[1]) {
              adminArea1 = stateCodeMatch[1];
            }

            shipping = {
              name: data.guestName ? { fullName: data.guestName } : undefined,
              address: {
                addressLine1: data.shippingAddress,
                adminArea2: data.city,
                adminArea1,
                postalCode: data.pincode,
                countryCode,
              },
            };
          }

          const ppResponse = await ordersController.createOrder({
            body: {
              intent: CheckoutPaymentIntent.Capture,
              payer,
              purchaseUnits: [{
                amount: {
                  currencyCode: resolvedCurrency, // "USD" or "GBP"
                  value: amountStr,
                },
                description: "Gigi — The Awkward Age (Book)",
                customId: orderId, // our internal Order UUID — used for webhook reconciliation
                shipping,
              }],
              applicationContext: {
                brandName: "Infano.Care",
                locale: countryCode === "GB" ? "en-GB" : "en-US",
                userAction: OrderApplicationContextUserAction.PayNow,
                shippingPreference: hasUpfrontShipping
                  ? OrderApplicationContextShippingPreference.SetProvidedAddress
                  : OrderApplicationContextShippingPreference.GetFromFile,
              },
            },
            prefer: "return=representation",
          });

          if (ppResponse.result?.id) {
            paypalOrderId = ppResponse.result.id;
          } else {
            logger.error({ ppResponse }, "[PAYPAL] createOrder returned no ID");
            throw new Error("Failed to create PayPal order — no order ID returned");
          }

        } else {
          // ── Razorpay order (India) ────────────────────────────────────────────
          const rpOrder = await razorpay.orders.create({
            amount: Math.round(totalAmount * 100),
            currency: resolvedCurrency,
            receipt: `rcpt_${Date.now()}`,
            notes: {
              product_type: "physical_book",
              hsn_code: "4901",
              rbi_purpose_code: "P0102",
              shipping_address: `${data.shippingAddress}, ${data.city}, ${data.state} - ${data.pincode}`,
              customer_phone: data.guestPhone || "",
              country: country,
            },
          });
          razorpayOrderId = rpOrder.id;
        }
      }

      // 5. Create Order record
      const order = await tx.order.create({
        data: {
          id: orderId,
          userId: resolvedUserId,
          guestEmail: data.guestEmail || (isInternational ? "pending_paypal@infano.care" : undefined),
          guestName: data.guestName || (isInternational ? "PayPal Customer" : undefined),
          guestPhone: data.guestPhone || (isInternational ? "" : undefined),
          country,
          currency: resolvedCurrency,
          subtotal,
          taxableAmount,
          cgstAmount,
          sgstAmount,
          gstAmount,
          deliveryCharge,
          discountAmount,
          totalAmount,
          paymentMethod: data.paymentMethod,
          shippingAddress: data.shippingAddress || (isInternational ? "Pending PayPal Checkout" : ""),
          city: data.city || (isInternational ? "Pending" : ""),
          state: data.state || (isInternational ? "Pending" : ""),
          pincode: data.pincode || (isInternational ? "00000" : ""),
          razorpayOrderId,
          paypalOrderId,
          couponId,
          orderStatus: OrderStatus.PLACED,
          gstNumber: data.gstNumber,
          comments: data.comments ? (typeof data.comments === "string" ? (() => { try { return JSON.parse(data.comments); } catch { return data.comments; } })() : data.comments) : undefined,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: { include: { book: true } },
        }
      });

      // 6. Update User Profile if userId is present
      if (resolvedUserId) {
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
              id: { not: resolvedUserId }
            }
          });
          if (!emailExists) {
            updateData.email = data.guestEmail;
          }
        }

        await tx.user.update({
          where: { id: resolvedUserId },
          data: updateData
        });
      }

      // 7. Manage Inventory for COD
      if (data.paymentMethod === PaymentMethod.COD) {
        for (const item of orderItems) {
          await tx.book.update({
            where: { id: item.bookId },
            data: { stock: { decrement: item.quantity } }
          });
        }
      }

      return {
        ...order,
        currency: resolvedCurrency,
        razorpayKeyId: env.RAZORPAY_KEY_ID || "",
        paypalOrderId: order.paypalOrderId || null,
        paypalClientId: env.PAYPAL_CLIENT_ID || "",
      };
    }, {
      timeout: 20000
    });

    const finalResult = result as any;
    if (finalResult.paymentMethod === PaymentMethod.COD && finalResult.guestEmail) {
      this._sendPlacedEmail(finalResult);
    }

    return result;
  }

  static async completeOrder(razorpayOrderId: string, razorpayPaymentId?: string, razorpaySignature?: string) {
    const order = await prisma.order.findUnique({
      where: { razorpayOrderId },
      include: { items: { include: { book: true } } }
    });
    if (!order) {
      // Check if it's a webinar registration
      const registration = await prisma.webinarRegistration.findUnique({
        where: { razorpayOrderId },
        include: { webinar: true }
      });
      if (!registration) {
        // Check if it's a demo session booking
        const demo = await prisma.demoSession.findUnique({
          where: { razorpayOrderId }
        });
        if (demo) {
          if (demo.paymentStatus === PaymentStatus.COMPLETED) {
            return demo;
          }
          const { ProgramsService } = await import("../programs/programs.service.js");
          const result = await ProgramsService.verifyDemoPayment({
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature
          });
          return result.demo;
        }
        return null;
      }

      if (registration.paymentStatus === PaymentStatus.COMPLETED) {
        return registration; // already completed
      }

      // Find or create user from guestPhone if userId is missing
      let userId = registration.userId;
      if (!userId && registration.guestPhone) {
        const normalized = normalizePhone(registration.guestPhone);
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
                  displayName: registration.guestName || "Parent",
                  totalPoints: 0,
                }
              }
            }
          });
        }
        userId = user.id;
      }

      // Update webinar registration status to COMPLETED
      const updatedRegistration = await prisma.webinarRegistration.update({
        where: { razorpayOrderId },
        data: {
          paymentStatus: PaymentStatus.COMPLETED,
          razorpayPaymentId,
          razorpaySignature,
          userId: userId || undefined,
        },
        include: { webinar: true }
      });

      // Send webinar confirmation email using dynamic date & time
      if (updatedRegistration.guestEmail) {
        const webinar = updatedRegistration.webinar;
        
        // Dynamic Date & Time formatting from DB
        const date = webinar.date;
        const formatterDate = new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'Asia/Kolkata'
        });
        const formatterTime = new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata'
        });

        const webinar_date = formatterDate.format(date);
        const webinar_time = `${formatterTime.format(date)} (IST)`;

        sendWebinarConfirmationEmail(updatedRegistration.guestEmail, {
          parent_name: updatedRegistration.guestName || "Parent",
          order_id: updatedRegistration.id.slice(0, 8).toUpperCase(),
          webinar_date,
          webinar_time,
          download_pdf_url: "https://api.infano.care/uploads/assets/3_Signals_Decision_Card.pdf",
          whatsapp_group_url: "https://chat.whatsapp.com/Hcu2sCgARbqH8PMbmW9nGv?s=cl&p=a&ilr=1&amv=1",
          zoom_link: webinar.zoomLink || webinar.link || "https://zoom.us/j/mock-webinar-id",
          webinar_title: webinar.title,
          webinar_platform: webinar.mode === 'ONLINE' ? 'Zoom (Live Online Session)' : 'Offline Session'
        }).catch(err => logger.error({ err, registrationId: updatedRegistration.id }, "[EMAIL] Failed to send webinar registration email"));
      }

      return updatedRegistration;
    }

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

    if (order.guestEmail) {
      const containsWebinar = order.items.some((i: any) => i.bookId.startsWith("webinar-"));
      if (containsWebinar) {
        (async () => {
          try {
            const webinarItem = order.items.find((i: any) => i.bookId.startsWith("webinar-"));
            let webinarDateStr = "Saturday, July 25, 2026";
            let webinarTimeStr = "05:00 PM (IST)";
            let webinarZoomLink = "https://zoom.us/j/mock-webinar-id";
            let webinarTitle = "Decoding Her Silence Parent Webinar";
            let webinarPlatform = "Zoom (Live Online Session)";

            if (webinarItem) {
              const webinar = await prisma.webinar.findUnique({
                where: { id: webinarItem.bookId }
              });
              if (webinar) {
                const date = webinar.date;
                const formatterDate = new Intl.DateTimeFormat('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  timeZone: 'Asia/Kolkata'
                });
                const formatterTime = new Intl.DateTimeFormat('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                  timeZone: 'Asia/Kolkata'
                });
                webinarDateStr = formatterDate.format(date);
                webinarTimeStr = `${formatterTime.format(date)} (IST)`;
                webinarZoomLink = webinar.zoomLink || webinar.link || webinarZoomLink;
                webinarTitle = webinar.title;
                webinarPlatform = webinar.mode === 'ONLINE' ? 'Zoom (Live Online Session)' : 'Offline Session';
              }
            }

            await sendWebinarConfirmationEmail(order.guestEmail!, {
              parent_name: order.guestName || "Parent",
              order_id: order.id.slice(0, 8).toUpperCase(),
              webinar_date: webinarDateStr,
              webinar_time: webinarTimeStr,
              download_pdf_url: "https://api.infano.care/uploads/assets/3_Signals_Decision_Card.pdf",
              whatsapp_group_url: "https://chat.whatsapp.com/Hcu2sCgARbqH8PMbmW9nGv?s=cl&p=a&ilr=1&amv=1",
              zoom_link: webinarZoomLink,
              webinar_title: webinarTitle,
              webinar_platform: webinarPlatform
            });
          } catch (err) {
            logger.error({ err, orderId: order.id }, "[EMAIL] Failed to send webinar email");
          }
        })();
      } else {
        this._sendPlacedEmail({ ...order, paymentStatus: PaymentStatus.COMPLETED });
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
              const newEnrollment = await prisma.programEnrollment.create({
                data: {
                  userId,
                  programId: program.id,
                  pricePaid: item.price,
                  status: "ACTIVE",
                  guestName: order.guestName,
                  guestEmail: order.guestEmail,
                }
              });

              import("../programs/session-notification.service.js").then(({ SessionNotificationService }) => {
                SessionNotificationService.notifyProgramEnrollment(newEnrollment.id).catch(err => {
                  logger.error({ err, enrollmentId: newEnrollment.id }, "Failed to dispatch program enrollment notification for shop order");
                });
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

    // Bypass verification signature check for simulated and Stripe payments
    if (razorpayOrderId.startsWith("INT_MOCK_") || razorpayOrderId.startsWith("STRIPE_")) {
      return await this.completeOrder(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    }

    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET || "")
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpaySignature) {
      return await this.completeOrder(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    } else {
      const order = await prisma.order.findUnique({ where: { razorpayOrderId } });
      if (order) {
        await prisma.order.update({
          where: { razorpayOrderId },
          data: { paymentStatus: PaymentStatus.FAILED }
        });
      } else {
        const registration = await prisma.webinarRegistration.findUnique({ where: { razorpayOrderId } });
        if (registration) {
          await prisma.webinarRegistration.update({
            where: { razorpayOrderId },
            data: { paymentStatus: PaymentStatus.FAILED }
          });
        }
      }
      throw new Error("Payment verification failed: Invalid signature");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PayPal Methods (US / UK orders)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Process Direct Credit/Debit Card Payment via PayPal REST API v2
   * Completely bypasses frontend iframe / ACDC restrictions.
   */
  static async payWithCardDirect(data: {
    userId?: string;
    guestEmail: string;
    guestName: string;
    guestPhone?: string;
    shippingAddress: string;
    city: string;
    state: string;
    pincode: string;
    items: { bookId: string; quantity: number }[];
    country: string;
    currency?: string;
    card: {
      number: string;
      expiry: string;
      cvv: string;
      name?: string;
    };
  }) {
    const { country, card } = data;
    const resolvedCountry = country === "UK" || country === "GB" ? "UK" : "US";
    const countryCode = resolvedCountry === "UK" ? "GB" : "US";
    const resolvedCurrency = data.currency || (resolvedCountry === "UK" ? "GBP" : "USD");

    // 1. Calculate subtotal & verify stock
    let subtotal = 0;
    const orderItems = [];
    for (const item of data.items) {
      const book = await prisma.book.findUnique({ where: { id: item.bookId } });
      if (!book) throw new AppError(`Book not found: ${item.bookId}`, 404);
      if (book.stock < item.quantity) throw new AppError(`Out of stock: ${book.title}`, 400);

      let bookPrice = book.price;
      if (resolvedCountry === "US") {
        bookPrice = (book as any).priceUS != null
          ? (book as any).priceUS
          : Math.round((book.price / 83) * 100) / 100;
      } else if (resolvedCountry === "UK") {
        bookPrice = (book as any).priceUK != null
          ? (book as any).priceUK
          : Math.round((book.price / 105) * 100) / 100;
      }

      subtotal += bookPrice * item.quantity;
      orderItems.push({
        bookId: item.bookId,
        quantity: item.quantity,
        price: bookPrice,
      });
    }

    const firstBook = await prisma.book.findUnique({ where: { id: data.items[0]?.bookId || "" } });
    const deliveryCharge = resolvedCountry === "UK"
      ? ((firstBook as any)?.shippingUK ?? 0)
      : ((firstBook as any)?.shippingUS ?? 0);
    const totalAmount = subtotal + deliveryCharge;
    const amountStr = (Math.round(totalAmount * 100) / 100).toFixed(2);

    // Format Expiry date to YYYY-MM
    let cleanExpiry = card.expiry.trim();
    if (cleanExpiry.includes("/")) {
      const parts = cleanExpiry.split("/").map(s => s.trim());
      const m = parts[0] || "01";
      const y = parts[1] || "30";
      const fullYear = y.length === 2 ? `20${y}` : y;
      const fullMonth = m.padStart(2, "0");
      cleanExpiry = `${fullYear}-${fullMonth}`;
    }

    // Format State code (e.g., "California (CA)" -> "CA")
    let adminArea1 = (data.state || "").trim();
    const stateMatch = adminArea1.match(/\(([^)]+)\)/);
    if (stateMatch && stateMatch[1]) {
      adminArea1 = stateMatch[1];
    }

    const cleanCardNumber = card.number.replace(/\D/g, "");
    const cleanCvv = card.cvv.replace(/\D/g, "");

    // 2. Create pending order record in DB
    const orderId = uuidv4();
    const order = await prisma.order.create({
      data: {
        id: orderId,
        userId: data.userId,
        guestEmail: data.guestEmail,
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        country: resolvedCountry,
        currency: resolvedCurrency,
        subtotal,
        taxableAmount: subtotal,
        deliveryCharge,
        discountAmount: 0,
        totalAmount,
        paymentMethod: PaymentMethod.ONLINE,
        shippingAddress: data.shippingAddress,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        orderStatus: OrderStatus.PLACED,
        paymentStatus: PaymentStatus.PENDING,
        comments: {
          flow: "DIRECT_CARD_REST_API",
          gateway: "PAYPAL",
        },
        items: {
          create: orderItems,
        },
      },
      include: { items: { include: { book: true } } },
    });

    // 3. Call PayPal REST Orders API v2
    const accessToken = await getPaypalAccessToken();
    const paypalPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: resolvedCurrency,
            value: amountStr,
          },
          description: "Gigi — The Awkward Age (Book)",
          custom_id: orderId,
          shipping: {
            name: { full_name: data.guestName },
            address: {
              address_line_1: data.shippingAddress,
              admin_area_2: data.city,
              admin_area_1: adminArea1,
              postal_code: data.pincode,
              country_code: countryCode,
            },
          },
        },
      ],
      payment_source: {
        card: {
          name: card.name || data.guestName,
          number: cleanCardNumber,
          expiry: cleanExpiry,
          security_code: cleanCvv,
          billing_address: {
            address_line_1: data.shippingAddress,
            admin_area_2: data.city,
            admin_area_1: adminArea1,
            postal_code: data.pincode,
            country_code: countryCode,
          },
        },
      },
    };

    logger.info({ orderId, country: resolvedCountry, amount: amountStr }, "[PAYPAL] Calling direct card payment");

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paypalPayload),
    });

    const responseData: any = await response.json();

    if (!response.ok) {
      logger.error({ responseData, status: response.status }, "[PAYPAL] Direct card payment failed");
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: PaymentStatus.FAILED },
      });

      const details = responseData.details?.[0];
      let userMsg = "Card payment was declined by the bank. Please verify card number, expiration date, and CVV.";
      if (details?.issue === "CARD_EXPIRED") {
        userMsg = "Card has expired. Please enter a valid expiration date.";
      } else if (details?.issue === "INVALID_SECURITY_CODE") {
        userMsg = "Security code (CVV) is invalid.";
      } else if (details?.issue === "PAYMENT_SOURCE_CANNOT_BE_USED" || details?.issue === "PAYMENT_SOURCE_DECLINED_BY_PROCESSOR") {
        userMsg = "Card was declined. Please try another card or use PayPal Wallet.";
      } else if (details?.description) {
        userMsg = details.description;
      } else if (responseData.message) {
        userMsg = responseData.message;
      }

      throw new AppError(userMsg, 400);
    }

    const paypalOrderId = responseData.id;
    const captureUnit = responseData.purchase_units?.[0]?.payments?.captures?.[0];
    const captureId = captureUnit?.id || null;
    const captureStatus = captureUnit?.status || responseData.status;

    await prisma.order.update({
      where: { id: orderId },
      data: { paypalOrderId },
    });

    if (captureStatus === "COMPLETED") {
      return await this.completeOrderByPaypalOrderId(paypalOrderId, captureId, responseData);
    } else {
      return await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { book: true } } },
      });
    }
  }

  /**
   * Captures an approved PayPal order.
   *
   * Safety guarantees:
   *  1. Already-completed orders are returned immediately (idempotent).
   *  2. Calls PayPal captureOrder to capture the authorized funds.
   *  3. Completes the DB order, adjusts inventory, logs success.
   */
  static async capturePaypalOrder(paypalOrderId: string) {
    // 1. Resolve the order
    const order = await prisma.order.findUnique({
      where: { paypalOrderId },
      include: { items: { include: { book: true } } },
    });
    if (!order) throw new AppError("Order not found", 404);

    // 2. Idempotency — already completed
    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      logger.info({ paypalOrderId }, "[PAYPAL] capturePaypalOrder: already completed, returning early");
      return order;
    }

    try {
      // 3. Call PayPal capture API
      const ordersController = getPaypalOrdersController();
      const captureResponse = await ordersController.captureOrder({
        id: paypalOrderId,
        prefer: "return=representation",
      });

      const capture = captureResponse.result;
      const captureUnit = capture?.purchaseUnits?.[0]?.payments?.captures?.[0];
      const captureId: string | null = captureUnit?.id ?? null;
      const captureStatus: string | undefined = captureUnit?.status;

      logger.info(
        { paypalOrderId, captureId, captureStatus },
        "[PAYPAL] captureOrder API response"
      );

      if (captureStatus !== "COMPLETED") {
        // PayPal returned a non-success status — mark as failed
        await prisma.order.update({
          where: { paypalOrderId },
          data: { paymentStatus: PaymentStatus.FAILED },
        });
        throw new AppError(
          `PayPal payment was not successful (status: ${captureStatus ?? "unknown"})`,
          402
        );
      }

      // 4. Complete the order (inventory, coupon, email, save verified address from PayPal)
      return await this.completeOrderByPaypalOrderId(paypalOrderId, captureId, capture);

    } catch (err: any) {
      throw err;
    }
  }

  /**
   * Completes an Order identified by its PayPal order ID:
   * sets paymentStatus = COMPLETED, records captureId, decrements inventory,
   * increments coupon usage, extracts verified shipping & payer data from PayPal, and sends confirmation emails.
   *
   * This is the PayPal equivalent of completeOrder() (which is keyed by razorpayOrderId).
   */
  static async completeOrderByPaypalOrderId(
    paypalOrderId: string,
    captureId: string | null,
    paypalDetails?: any
  ) {
    const order = await prisma.order.findUnique({
      where: { paypalOrderId },
      include: { items: { include: { book: true } } },
    });
    if (!order) throw new AppError("Order not found for paypalOrderId: " + paypalOrderId, 404);

    // Guard: already completed (idempotent)
    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      logger.info({ paypalOrderId }, "[PAYPAL] completeOrderByPaypalOrderId: order already completed");
      return order;
    }

    // Extract verified shipping and payer details from PayPal response
    const shipping = paypalDetails?.purchaseUnits?.[0]?.shipping || paypalDetails?.shipping;
    const payer = paypalDetails?.payer;
    const address = shipping?.address;

    const guestName =
      shipping?.name?.fullName ||
      (payer?.name?.givenName ? `${payer.name.givenName} ${payer.name.surname || ""}`.trim() : null) ||
      (order.guestName && !order.guestName.startsWith("PayPal Customer") ? order.guestName : "Customer");

    const guestEmail =
      payer?.emailAddress ||
      payer?.email_address ||
      (order.guestEmail && !order.guestEmail.includes("pending_paypal") ? order.guestEmail : null);

    const guestPhone =
      payer?.phone?.phoneNumber?.nationalNumber ||
      payer?.phone?.phone_number?.national_number ||
      order.guestPhone ||
      null;

    let shippingAddress = order.shippingAddress;
    if (address?.addressLine1 || address?.address_line_1) {
      const line1 = address.addressLine1 || address.address_line_1;
      const line2 = address.addressLine2 || address.address_line_2;
      shippingAddress = [line1, line2].filter(Boolean).join(", ");
    }

    const city = address?.adminArea2 || address?.admin_area_2 || order.city;
    const state = address?.adminArea1 || address?.admin_area_1 || order.state;
    const pincode = address?.postalCode || address?.postal_code || order.pincode;
    
    // Validate that shipping country aligns with order region
    let country = order.country || "US";
    const rawCountryCode = (address?.countryCode || address?.country_code || "").toUpperCase();
    if (rawCountryCode) {
      const allowedCountryCodes = (order.country === "UK" || order.country === "GB") ? ["GB", "UK"] : [order.country || "US"];
      if (!allowedCountryCodes.includes(rawCountryCode)) {
        logger.warn(
          { paypalOrderId, rawCountryCode, orderCountry: order.country },
          "[PAYPAL] Shipping country mismatch: buyer selected an address outside the store region"
        );
      }
      country = rawCountryCode === "GB" ? "UK" : rawCountryCode;
    }

    // Resolve or sync user from guestPhone if available
    let userId = order.userId;
    if (!userId && guestPhone) {
      const normalized = normalizePhone(guestPhone);
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
                displayName: guestName || "Parent",
              },
            },
          },
        });
      }
      userId = user.id;
    }

    // Prepare comments with raw PayPal meta
    let updatedComments: any = order.comments;
    if (paypalDetails) {
      const existingComments = Array.isArray(order.comments)
        ? order.comments
        : (order.comments ? [order.comments] : []);
      updatedComments = [
        ...existingComments,
        {
          source: "PAYPAL_EXPRESS",
          capturedAt: new Date().toISOString(),
          payerId: payer?.payerId || payer?.payer_id,
          shipping: shipping || null,
          payer: payer || null,
        }
      ];
    }

    // Update order to COMPLETED with verified PayPal details
    const updatedOrder = await prisma.order.update({
      where: { paypalOrderId },
      data: {
        paymentStatus: PaymentStatus.COMPLETED,
        paypalCaptureId: captureId,
        userId: userId ?? undefined,
        guestName,
        guestEmail,
        guestPhone,
        shippingAddress,
        city,
        state,
        pincode,
        country,
        comments: updatedComments,
      },
      include: { items: { include: { book: true } } },
    });

    // Decrement book stock
    for (const item of order.items) {
      await prisma.book.update({
        where: { id: item.bookId },
        data: { stock: { decrement: item.quantity } },
      }).catch((err) => {
        logger.error({ err, bookId: item.bookId }, "[PAYPAL] Failed to decrement stock");
      });
    }

    // Increment coupon usage
    if (order.couponId) {
      await prisma.discountCoupon.update({
        where: { id: order.couponId },
        data: { usedCount: { increment: 1 } },
      }).catch((err) => {
        logger.error({ err, couponId: order.couponId }, "[PAYPAL] Failed to increment coupon usage");
      });
    }

    // Send confirmation email (non-blocking)
    if (order.guestEmail) {
      this._sendPlacedEmail({ ...updatedOrder, paymentStatus: PaymentStatus.COMPLETED } as any);
    }

    logger.info(
      { orderId: order.id, paypalOrderId, captureId },
      "[PAYPAL] Order completed successfully"
    );

    return updatedOrder;
  }

  /**
   * Handles incoming PayPal webhooks.
   *
   * Supports:
   *  - PAYMENT.CAPTURE.COMPLETED  → complete the order
   *  - PAYMENT.CAPTURE.DENIED     → mark order FAILED
   *  - PAYMENT.CAPTURE.DECLINED   → mark order FAILED
   *
   * Always returns { received: true } so PayPal stops retrying.
   * Never throws — logs errors and returns 200 to PayPal.
   */
  static async handlePaypalWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>
  ): Promise<{ received: boolean }> {
    // 1. Verify signature
    const isValid = await verifyPaypalWebhookSignature(rawBody, headers);
    if (!isValid) {
      throw new AppError("Invalid PayPal webhook signature", 401);
    }

    let event: any;
    try {
      event = JSON.parse(rawBody.toString("utf8"));
    } catch {
      logger.error("[PAYPAL_WEBHOOK] Failed to parse event JSON");
      return { received: true }; // still 200 to PayPal
    }

    const eventType: string = event?.event_type ?? "";
    logger.info({ eventType, eventId: event?.id }, "[PAYPAL_WEBHOOK] Processing event");

    try {
      if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
        const captureId: string = event.resource?.id;
        // PayPal supplies our customId (internal order UUID) in the capture resource
        const customId: string | undefined = event.resource?.custom_id;
        // Also attempt resolution via supplementary paypal order ID
        const paypalOrderId: string | undefined =
          event.resource?.supplementary_data?.related_ids?.order_id;

        // Find the order (try by paypalOrderId first, fall back to our internal id)
        let dbOrder = paypalOrderId
          ? await prisma.order.findUnique({ where: { paypalOrderId } })
          : null;

        if (!dbOrder && customId) {
          dbOrder = await prisma.order.findUnique({ where: { id: customId } });
        }

        if (!dbOrder) {
          logger.warn(
            { paypalOrderId, customId, captureId },
            "[PAYPAL_WEBHOOK] PAYMENT.CAPTURE.COMPLETED — could not find matching order"
          );
          return { received: true };
        }

        if (dbOrder.paymentStatus !== PaymentStatus.COMPLETED) {
          await this.completeOrderByPaypalOrderId(dbOrder.paypalOrderId!, captureId);
          logger.info(
            { orderId: dbOrder.id, paypalOrderId: dbOrder.paypalOrderId, captureId },
            "[PAYPAL_WEBHOOK] Order completed via webhook"
          );
        } else {
          logger.info(
            { orderId: dbOrder.id },
            "[PAYPAL_WEBHOOK] PAYMENT.CAPTURE.COMPLETED — order already completed, ignoring"
          );
        }

      } else if (
        eventType === "PAYMENT.CAPTURE.DENIED" ||
        eventType === "PAYMENT.CAPTURE.DECLINED"
      ) {
        const paypalOrderId: string | undefined =
          event.resource?.supplementary_data?.related_ids?.order_id;
        const customId: string | undefined = event.resource?.custom_id;

        if (paypalOrderId) {
          await prisma.order.updateMany({
            where: {
              paypalOrderId,
              paymentStatus: { not: PaymentStatus.COMPLETED },
            },
            data: { paymentStatus: PaymentStatus.FAILED },
          });
          logger.info({ paypalOrderId, eventType }, "[PAYPAL_WEBHOOK] Order marked FAILED");
        } else if (customId) {
          await prisma.order.updateMany({
            where: {
              id: customId,
              paymentStatus: { not: PaymentStatus.COMPLETED },
            },
            data: { paymentStatus: PaymentStatus.FAILED },
          });
          logger.info({ customId, eventType }, "[PAYPAL_WEBHOOK] Order marked FAILED via customId");
        }

      } else {
        logger.info({ eventType }, "[PAYPAL_WEBHOOK] Unhandled event type — ignoring");
      }
    } catch (err) {
      // Log but do NOT rethrow — we always return 200 to PayPal to stop retries
      logger.error({ err, eventType }, "[PAYPAL_WEBHOOK] Error processing webhook event");
    }

    return { received: true };
  }

  static isValidTransition(current: OrderStatus, next: OrderStatus): boolean {

    const transitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PLACED]: [OrderStatus.PROCESSING, OrderStatus.ON_HOLD, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.ON_HOLD, OrderStatus.CANCELLED],
      [OrderStatus.ON_HOLD]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };
    return transitions[current]?.includes(next) || false;
  }

  static async updateStatus(id: string, nextStatus: OrderStatus, awbNumber?: string) {
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
      const updateData: any = { orderStatus: nextStatus };
      if (nextStatus === OrderStatus.SHIPPED && awbNumber?.trim()) {
        updateData.awbNumber = awbNumber.trim();
      }

      const updated = await prisma.order.update({
        where: { id },
        data: updateData,
        include: { items: { include: { book: true } } }
      });

      if (updated.guestEmail) {
        if (nextStatus === OrderStatus.SHIPPED) {
          this._sendShippedEmail(updated);
        } else if (nextStatus === OrderStatus.DELIVERED) {
          this._sendDeliveredEmail(updated);
        }
      }
      return updated;
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

      const order = await prisma.order.findUnique({ where: { razorpayOrderId } });
      if (order) {
        await prisma.order.update({
          where: { razorpayOrderId },
          data: { paymentStatus: PaymentStatus.FAILED }
        });
      } else {
        const registration = await prisma.webinarRegistration.findUnique({ where: { razorpayOrderId } });
        if (registration) {
          await prisma.webinarRegistration.update({
            where: { razorpayOrderId },
            data: { paymentStatus: PaymentStatus.FAILED }
          });
        }
      }
    }

    return { received: true };
  }

  static async getUserOrders(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true }
      });
      if (user?.phone) {
        const normalizedPhone = normalizePhone(user.phone);
        await prisma.order.updateMany({
          where: {
            guestPhone: normalizedPhone,
            userId: { not: userId }
          },
          data: {
            userId
          }
        });
        await prisma.webinarRegistration.updateMany({
          where: {
            guestPhone: normalizedPhone,
            userId: { not: userId }
          },
          data: {
            userId
          }
        });
      }
    } catch (syncErr) {
      logger.error({ err: syncErr, userId }, "Failed to sync guest orders/registrations in getUserOrders");
    }

    const orders = await prisma.order.findMany({
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

    return orders.map(order => {
      if (order.orderStatus === OrderStatus.ON_HOLD) {
        order.orderStatus = OrderStatus.PLACED;
      }
      return order;
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

  private static async _sendPlacedEmail(order: any) {
    try {
      logger.info({ orderId: order.id, to: order.guestEmail }, "[EMAIL] Attempting to send Placed email");

      const orderDate = new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
      const address = {
        name: order.guestName || "Customer",
        full_address: `${order.shippingAddress}, ${order.city}, ${order.state} - ${order.pincode}`
      };

      const items = order.items.map((i: any) => ({
        title: i.book?.title || "Gigi Book",
        quantity: i.quantity,
        price: `₹${i.price}`
      }));

      const res = await sendGigiBookOrderPlacedEmail(order.guestEmail || "", {
        parent_name: order.guestName || "Parent",
        order_id: order.id.slice(0, 8).toUpperCase(),
        order_date: orderDate,
        shipping_address: address,
        payment_method: order.paymentMethod,
        order_items: items,
        subtotal: `₹${order.subtotal}`,
        discount: order.discountAmount > 0 ? `₹${order.discountAmount}` : "₹0",
        delivery_charge: `₹${order.deliveryCharge}`,
        total: `₹${order.totalAmount}`,
        track_order_url: "https://infano.care/store/track"
      });

      logger.info({ orderId: order.id, messageId: res?.messageId }, "[EMAIL] Placed email sent successfully");
    } catch (err: any) {
      logger.error({ err, orderId: order.id }, "[EMAIL] Failed to send Placed email");
    }

    try {
      if (order.guestPhone) {
        const bookTitle = order.items.map((i: any) => i.book?.title || "Gigi Book").join(", ");
        const fullAddress = `${order.shippingAddress}, ${order.city}, ${order.state} - ${order.pincode}`;
        await sendOrderConfirmationWhatsApp(order.guestPhone, {
          customerName: order.guestName || "Parent",
          orderId: order.id.slice(0, 8).toUpperCase(),
          bookTitle,
          address: fullAddress,
        });
      }
    } catch (wErr: any) {
      logger.error({ err: wErr, orderId: order.id }, "[WHATSAPP] Failed to send Order Confirmation WhatsApp notification");
    }
  }

  private static async _sendShippedEmail(order: any) {
    try {
      logger.info({ orderId: order.id, to: order.guestEmail }, "[EMAIL] Attempting to send Shipped email");

      const address = {
        name: order.guestName || "Customer",
        full_address: `${order.shippingAddress}, ${order.city}, ${order.state} - ${order.pincode}`
      };

      const items = order.items.map((i: any) => ({
        title: i.book?.title || "Gigi Book",
        quantity: i.quantity
      }));

      const courierName = "Delhivery";
      const deliveryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

      // Use real AWB if available; otherwise fall back to order number display
      const awb = order.awbNumber?.trim();
      const displayTrackingId = awb || order.id.slice(0, 8).toUpperCase();
      const trackingUrl = awb
        ? `https://www.delhivery.com/track-v2/package/${awb}`
        : "https://infano.care/login";
      const trackOrderUrl = awb
        ? `https://www.delhivery.com/track-v2/package/${awb}`
        : "https://infano.care/login";

      const res = await sendGigiBookOrderShippedEmail(order.guestEmail || "", {
        parent_name: order.guestName || "Parent",
        order_id: order.id.slice(0, 8).toUpperCase(),
        courier_name: courierName,
        tracking_id: displayTrackingId,
        delivery_date: deliveryDate,
        shipping_address: address,
        order_items: items,
        track_order_url: trackOrderUrl,
        tracking_url: trackingUrl
      });

      logger.info({ orderId: order.id, messageId: res?.messageId }, "[EMAIL] Shipped email sent successfully");
    } catch (err: any) {
      logger.error({ err, orderId: order.id }, "[EMAIL] Failed to send Shipped email");
    }

    try {
      if (order.guestPhone) {
        const awb = order.awbNumber?.trim();
        const trackingUrl = awb
          ? `https://www.delhivery.com/track-v2/package/${awb}`
          : "https://infano.care/login";
        const estDeliveryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        await sendOrderShippedWhatsApp(order.guestPhone, {
          customerName: order.guestName || "Parent",
          orderId: order.id.slice(0, 8).toUpperCase(),
          trackUrl: trackingUrl,
          deliveryDate: estDeliveryDate,
        });
      }
    } catch (wErr: any) {
      logger.error({ err: wErr, orderId: order.id }, "[WHATSAPP] Failed to send Shipped WhatsApp notification");
    }
  }

  private static async _sendDeliveredEmail(order: any) {
    try {
      logger.info({ orderId: order.id, to: order.guestEmail }, "[EMAIL] Attempting to send Delivered email");

      const items = order.items.map((i: any) => ({
        title: i.book?.title || "Gigi Book",
        quantity: i.quantity
      }));

      const deliveryDate = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" });

      const res = await sendGigiBookOrderDeliveredEmail(order.guestEmail || "", {
        parent_name: order.guestName || "Parent",
        order_id: order.id.slice(0, 8).toUpperCase(),
        delivery_date: deliveryDate,
        order_items: items,
        view_order_url: "https://infano.care/store/track",
        explore_url: "https://infano.care/explore"
      });

      logger.info({ orderId: order.id, messageId: res?.messageId }, "[EMAIL] Delivered email sent successfully");
    } catch (err: any) {
      logger.error({ err, orderId: order.id }, "[EMAIL] Failed to send Delivered email");
    }

    try {
      if (order.guestPhone) {
        await sendOrderDeliveredWhatsApp(order.guestPhone, {
          customerName: order.guestName || "Parent",
          orderId: order.id.slice(0, 8).toUpperCase(),
          feedbackUrl: "https://infano.care/store/track",
        });
      }
    } catch (wErr: any) {
      logger.error({ err: wErr, orderId: order.id }, "[WHATSAPP] Failed to send Delivered WhatsApp notification");
    }
  }

  static async getRecentPurchases() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        isActive: true,
        orderStatus: { not: OrderStatus.CANCELLED },
        OR: [
          { paymentStatus: PaymentStatus.COMPLETED },
          { paymentMethod: PaymentMethod.COD }
        ],
        createdAt: {
          gte: startOfToday
        }
      },
      include: {
        user: {
          include: {
            profile: true
          }
        },
        items: {
          include: {
            book: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const formattedOrders = orders
      .filter(o => o.items.some(item => item.book))
      .map(o => {
        let rawName = "Someone";
        if (o.guestName) {
          rawName = o.guestName;
        } else if (o.user?.profile?.displayName) {
          rawName = o.user.profile.displayName;
        } else if (o.user?.username) {
          rawName = o.user.username;
        }

        const firstName = rawName.trim().split(/\s+/)[0] || "Someone";
        const bookTitle = o.items[0]?.book?.title || "The Awkward Age";

        return {
          name: firstName,
          bookTitle,
          createdAt: o.createdAt
        };
      });

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const last2HoursPurchases = formattedOrders.filter(o => new Date(o.createdAt) >= twoHoursAgo);
    const olderTodayPurchases = formattedOrders.filter(o => new Date(o.createdAt) < twoHoursAgo);

    // Sort last2Hours: newest first
    last2HoursPurchases.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Sort olderToday: oldest to latest of current date
    olderTodayPurchases.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return [...last2HoursPurchases, ...olderTodayPurchases];
  }
}

