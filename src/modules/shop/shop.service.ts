import { prisma } from "../../db/client.js";
import Razorpay from "razorpay";
import { env } from "../../config/env.js";
import crypto from "crypto";
import { logger } from "../../config/logger.js";
import { PaymentMethod, PaymentStatus, OrderStatus, CouponType } from "@prisma/client";
import { normalizePhone } from "../../common/utils/phone.js";
import { sendGigiBookOrderPlacedEmail, sendGigiBookOrderShippedEmail, sendGigiBookOrderDeliveredEmail, sendWebinarConfirmationEmail } from "../../common/services/email.service.js";
import { sendOrderConfirmationWhatsApp, sendOrderShippedWhatsApp, sendOrderDeliveredWhatsApp } from "../../common/services/whatsapp.service.js";
import { v4 as uuidv4 } from "uuid";

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
          { id: { endsWith: "-group" } },
          { id: { startsWith: "webinar-" } }
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

  static async getWebinarBySlug(slug: string) {
    if (slug === 'active') {
      return await prisma.webinar.findFirst({
        where: { isActive: true },
        orderBy: { date: 'asc' }
      });
    }
    return await prisma.webinar.findFirst({
      where: { slug, isActive: true },
    });
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

        let razorpayOrderId = null;
        if (data.paymentMethod === PaymentMethod.ONLINE) {
          const options = {
            amount: Math.round(totalAmount * 100),
            currency: "INR",
            receipt: `rcpt_webinar_${Date.now()}`,
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
          razorpayOrderId: registration.razorpayOrderId,
          paymentMethod: registration.paymentMethod,
          paymentStatus: registration.paymentStatus,
          createdAt: registration.createdAt,
          updatedAt: registration.updatedAt,
        } as any;
      }

      // Parse country from comments
      let country = "IN";
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
            if (cleaned === "US" || cleaned === "UK" || cleaned === "IN") {
              country = cleaned;
            }
          }
        }
      }

      // Generate order ID beforehand so Stripe can use it
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
        } else if (country === "UK") {
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

      // 3. Calculate GST and Total (Production Grade Reverse Calculation)
      let taxableSubtotal = subtotal - discountAmount;
      let taxableAmount = taxableSubtotal;
      let cgstAmount = 0;
      let sgstAmount = 0;
      let gstAmount = 0;
      let deliveryCharge = 0;
      let totalAmount = taxableSubtotal;

      // Determine delivery charge from first book's DB settings (applies uniformly across items)
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
      } else if (country === "UK") {
        deliveryCharge = (firstBook as any)?.shippingUK ?? 0;
        totalAmount = taxableSubtotal + deliveryCharge;
      }

      // 4. Create payment session/order if needed
      let razorpayOrderId = null;
      let stripeSessionUrl: string | undefined = undefined;

      if (data.paymentMethod === PaymentMethod.ONLINE) {
        if (country === "US" || country === "UK") {
          if (env.STRIPE_SECRET_KEY) {
            const frontendUrl = env.ALLOWED_ORIGINS?.[0] || "http://localhost:3000";

            const firstItemId = data.items[0]?.bookId || "";
            const firstItemTitle = firstItemId ? (bookTitles[firstItemId] || "Gigi Book") : "Gigi Book";
            const firstItemImageUrl = firstItemId ? (bookImageUrls[firstItemId] || "") : "";

            // Construct success URL with all parameters for receipt display
            const successUrl = `${frontendUrl}/purchase-success?transaction_id=${orderId}&session_id={CHECKOUT_SESSION_ID}`
              + `&value=${totalAmount}&quantity=${data.items[0]?.quantity || 1}&item_id=${firstItemId}`
              + `&item_name=${encodeURIComponent(firstItemTitle)}`
              + `&price=${orderItems[0]?.price || 0}&discount=${discountAmount}&delivery=${deliveryCharge}`
              + `&subtotal=${subtotal}&payment_method=ONLINE`
              + `&image_url=${encodeURIComponent(firstItemImageUrl)}`;

            const params = new URLSearchParams();
            params.append("payment_method_types[0]", "card");
            params.append("mode", "payment");
            params.append("success_url", successUrl);
            params.append("cancel_url", `${frontendUrl}/checkout`);
            if (data.guestEmail) {
              params.append("customer_email", data.guestEmail);
            }
            params.append("metadata[orderId]", orderId);

            // Add line items using array params syntax
            orderItems.forEach((item, idx) => {
              params.append(`line_items[${idx}][price_data][currency]`, country === "US" ? "usd" : "gbp");
              params.append(`line_items[${idx}][price_data][unit_amount]`, Math.round(item.price * 100).toString());
              params.append(`line_items[${idx}][price_data][product_data][name]`, bookTitles[item.bookId] || "Gigi Book");
              params.append(`line_items[${idx}][quantity]`, item.quantity.toString());
            });

            const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: params.toString(),
            });

            if (!stripeRes.ok) {
              const errBody = await stripeRes.text();
              logger.error(`[Stripe Checkout Session Error]: ${errBody}`);
              throw new Error("Stripe checkout session initialization failed");
            }

            const session = await stripeRes.json() as any;
            stripeSessionUrl = session.url || undefined;
            razorpayOrderId = `STRIPE_${session.id}`;
          } else {
            razorpayOrderId = `INT_MOCK_${orderId}`;
          }
        } else {
          const options = {
            amount: Math.round(totalAmount * 100),
            currency: "INR",
            receipt: `rcpt_${Date.now()}`,
          };
          const rpOrder = await razorpay.orders.create(options);
          razorpayOrderId = rpOrder.id;
        }
      }

      // 5. Create Order record
      const order = await tx.order.create({
        data: {
          id: orderId,
          userId: resolvedUserId,
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
          comments: data.comments ? JSON.parse(data.comments) : undefined,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: { include: { book: true } },
        }
      });

      // 6. Update User Profile if userId is present (as requested)
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

      // 7. Manage Inventory
      if (data.paymentMethod === PaymentMethod.COD) {
        for (const item of orderItems) {
          await tx.book.update({
            where: { id: item.bookId },
            data: { stock: { decrement: item.quantity } }
          });
        }
      }

      return { ...order, stripeSessionUrl, razorpayKeyId: env.RAZORPAY_KEY_ID || "" };
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
      if (!registration) return null;

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
          order_id: updatedRegistration.id.slice(-8).toUpperCase(),
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
              order_id: order.id.slice(-8).toUpperCase(),
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
              await prisma.programEnrollment.create({
                data: {
                  userId,
                  programId: program.id,
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
        order_id: order.id.slice(-8).toUpperCase(),
        order_date: orderDate,
        shipping_address: address,
        payment_method: order.paymentMethod,
        order_items: items,
        subtotal: `₹${order.subtotal}`,
        discount: order.discountAmount > 0 ? `₹${order.discountAmount}` : "₹0",
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
          orderId: order.id.slice(-8).toUpperCase(),
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
      const displayTrackingId = awb || order.id.slice(-8).toUpperCase();
      const trackingUrl = awb
        ? `https://www.delhivery.com/track-v2/package/${awb}`
        : "https://infano.care/login";
      const trackOrderUrl = awb
        ? `https://www.delhivery.com/track-v2/package/${awb}`
        : "https://infano.care/login";

      const res = await sendGigiBookOrderShippedEmail(order.guestEmail || "", {
        parent_name: order.guestName || "Parent",
        order_id: order.id.slice(-8).toUpperCase(),
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
          orderId: order.id.slice(-8).toUpperCase(),
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
        order_id: order.id.slice(-8).toUpperCase(),
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
          orderId: order.id.slice(-8).toUpperCase(),
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

