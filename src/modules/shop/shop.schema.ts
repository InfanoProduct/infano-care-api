import { z } from "zod";

// Helper regexes
const IN_PHONE_REGEX = /^(\+91[\-\s]?|91[\-\s]?)?[6-9]\d{9}$/;
const GLOBAL_PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;
const IN_PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const US_ZIP_REGEX = /^\d{5}(-\d{4})?$/;
const UK_POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;
const GENERIC_POSTAL_REGEX = /^[A-Za-z0-9\s\-]{3,10}$/;

// Valid Indian States & Union Territories
export const INDIA_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const normalizedIndiaStates = new Set(
  INDIA_STATES.map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, ""))
);

export const orderItemSchema = z.object({
  bookId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int("Quantity must be a valid integer").min(1, "Quantity must be at least 1").max(50, "Quantity is too large"),
});

export const createOrderBodySchema = z.object({
  userId: z.string().optional().nullable(),
  guestEmail: z.string().trim().email("Invalid email address").max(100, "Invalid email address").optional().or(z.literal("")).nullable(),
  guestName: z.string().trim().min(2, "Invalid name").max(100, "Invalid name").optional().or(z.literal("")).nullable(),
  guestPhone: z.string().trim().optional().or(z.literal("")).nullable(),
  shippingAddress: z.string().trim().max(300, "Invalid shipping address").optional().or(z.literal("")).nullable(),
  city: z.string().trim().max(100, "Invalid city").optional().or(z.literal("")).nullable(),
  state: z.string().trim().max(100, "Invalid state").optional().or(z.literal("")).nullable(),
  pincode: z.string().trim().optional().or(z.literal("")).nullable(),
  paymentMethod: z.enum(["ONLINE", "COD"], {
    errorMap: () => ({ message: "Invalid payment method" }),
  }),
  items: z.array(orderItemSchema).min(1, "Order must contain at least one item"),
  couponCode: z.string().trim().max(50, "Invalid coupon code").optional().or(z.literal("")).nullable(),
  gstNumber: z.string().trim().max(20, "Invalid GST number").optional().or(z.literal("")).nullable(),
  comments: z.union([z.string().max(500), z.record(z.any())]).optional().nullable(),
  currency: z.string().trim().max(10).optional().nullable(),
  country: z.string().trim().max(10).optional().nullable(),
}).superRefine((data, ctx) => {
  const country = (data.country || "IN").toUpperCase();

  // Validate Name if provided
  if (data.guestName && data.guestName.trim().length > 0) {
    if (!/^[a-zA-Z\s\.\'\-]{2,60}$/.test(data.guestName.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid name",
        path: ["guestName"],
      });
    }
  }

  // Validate Phone if provided
  if (data.guestPhone && data.guestPhone.trim().length > 0) {
    const cleanPhone = data.guestPhone.replace(/[\s\-\(\)\.]/g, "");
    const isIndia = country === "IN" || (cleanPhone.startsWith("+91") && country !== "US" && country !== "UK" && country !== "GB");
    
    if (isIndia) {
      if (!IN_PHONE_REGEX.test(cleanPhone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid mobile number",
          path: ["guestPhone"],
        });
      }
    } else {
      if (!GLOBAL_PHONE_REGEX.test(cleanPhone) && !/^\d{7,15}$/.test(cleanPhone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid phone number",
          path: ["guestPhone"],
        });
      }
    }
  }

  // Validate Pincode if provided
  if (data.pincode && data.pincode.trim().length > 0) {
    const pin = data.pincode.trim();
    if (country === "IN") {
      if (!IN_PINCODE_REGEX.test(pin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid PIN code",
          path: ["pincode"],
        });
      }
    } else if (country === "US") {
      if (!US_ZIP_REGEX.test(pin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid ZIP code",
          path: ["pincode"],
        });
      }
    } else {
      if (!UK_POSTCODE_REGEX.test(pin) && !GENERIC_POSTAL_REGEX.test(pin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid postal code",
          path: ["pincode"],
        });
      }
    }
  }

  // Validate State & City if provided
  if (data.state && data.state.trim().length > 0) {
    if (country === "IN") {
      const normalized = data.state.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!normalizedIndiaStates.has(normalized)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid state",
          path: ["state"],
        });
      }
    }
  }

  if (data.city && data.city.trim().length > 0) {
    if (!/^[a-zA-Z\s\.\-]{2,50}$/.test(data.city.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid city",
        path: ["city"],
      });
    }
  }

  if (data.shippingAddress && data.shippingAddress.trim().length > 0) {
    if (data.shippingAddress.trim().length < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid shipping address",
        path: ["shippingAddress"],
      });
    }
  }
});

export const createOrderSchema = z.object({
  body: createOrderBodySchema,
});

export const payCardSchema = z.object({
  body: z.object({
    userId: z.string().optional().nullable(),
    guestEmail: z.string().trim().email("Please enter a valid email address").max(100),
    guestName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
    guestPhone: z.string().trim().optional().or(z.literal("")).nullable(),
    shippingAddress: z.string().trim().min(3).max(300),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().min(2).max(100),
    pincode: z.string().trim().min(3).max(20),
    country: z.string().trim().max(10).optional().nullable(),
    currency: z.string().trim().max(10).optional().nullable(),
    items: z.array(orderItemSchema).min(1, "Order must contain at least one item"),
    couponCode: z.string().trim().max(50).optional().or(z.literal("")).nullable(),
    cardNumber: z.string().trim().min(12, "Invalid card number").max(19),
    cardExpiry: z.string().trim().regex(/^(0[1-9]|1[0-2])\/?([0-9]{2}|[0-9]{4})$/, "Invalid card expiry (MM/YY)"),
    cardCvv: z.string().trim().regex(/^\d{3,4}$/, "CVV must be 3 or 4 digits"),
    cardholderName: z.string().trim().min(2, "Cardholder name is required").max(100),
  }),
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    razorpayOrderId: z.string().min(1, "Razorpay Order ID is required"),
    razorpayPaymentId: z.string().min(1, "Razorpay Payment ID is required"),
    razorpaySignature: z.string().min(1, "Razorpay Signature is required"),
  }),
});

export const paypalCaptureSchema = z.object({
  body: z.object({
    paypalOrderId: z.string().min(1, "PayPal Order ID is required"),
  }),
});
