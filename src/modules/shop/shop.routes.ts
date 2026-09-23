import { Router } from "express";
import { ShopController } from "./shop.controller.js";

const router = Router();

/**
 * @openapi
 * /shop/books:
 *   get:
 *     summary: Get all active books
 *     tags: [Shop]
 *     responses:
 *       200:
 *         description: List of books
 */
router.get("/books", ShopController.getBooks);

/**
 * @openapi
 * /shop/books/{id}:
 *   get:
 *     summary: Get book details
 *     tags: [Shop]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Book details
 */
router.get("/books/:id", ShopController.getBook);
router.get("/webinars/:slug", ShopController.getWebinarBySlug);

/**
 * @openapi
 * /shop/recent-purchases:
 *   get:
 *     summary: Get recent book purchases
 *     tags: [Shop]
 *     responses:
 *       200:
 *         description: List of recent purchases
 */
router.get("/recent-purchases", ShopController.getRecentPurchases);


/**
 * @openapi
 * /shop/coupons/validate:
 *   post:
 *     summary: Validate a discount coupon
 *     tags: [Shop]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code: { type: string }
 *               amount: { type: number }
 *     responses:
 *       200:
 *         description: Coupon valid
 *       400:
 *         description: Invalid coupon
 */
router.post("/coupons/validate", ShopController.validateCoupon);

/**
 * @openapi
 * /shop/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Shop]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: string }
 *               guestEmail: { type: string }
 *               guestName: { type: string }
 *               guestPhone: { type: string }
 *               shippingAddress: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *               pincode: { type: string }
 *               paymentMethod: { type: string, enum: [ONLINE, COD] }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     bookId: { type: string }
 *                     quantity: { type: number }
 *     responses:
 *       201:
 *         description: Order created
 */
router.post("/orders", ShopController.createOrder);
router.post("/orders/pay-card", ShopController.payWithCard);

/**
 * @openapi
 * /shop/orders/verify:
 *   post:
 *     summary: Verify Razorpay payment
 *     tags: [Shop]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               razorpayOrderId: { type: string }
 *               razorpayPaymentId: { type: string }
 *               razorpaySignature: { type: string }
 *     responses:
 *       200:
 *         description: Payment verified
 */
router.post("/orders/verify", ShopController.verifyPayment);

/**
 * @openapi
 * /shop/orders/paypal-capture:
 *   post:
 *     summary: Capture an approved PayPal order (US/UK)
 *     tags: [Shop]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paypalOrderId]
 *             properties:
 *               paypalOrderId: { type: string, description: "PayPal Order ID returned from createOrder" }
 *     responses:
 *       200:
 *         description: Payment captured and order completed
 *       402:
 *         description: PayPal capture was not successful
 *       404:
 *         description: Order not found
 *       409:
 *         description: Capture already in progress
 */
router.post("/orders/paypal-capture", ShopController.capturePaypalOrder);

/**
 * @openapi
 * /shop/webhook:
 *   post:
 *     summary: Razorpay Webhook
 *     tags: [Shop]
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post("/webhook", ShopController.webhook);

/**
 * @openapi
 * /shop/webhook/paypal:
 *   post:
 *     summary: PayPal Webhook (US/UK order events)
 *     tags: [Shop]
 *     description: |
 *       Receives PayPal PAYMENT.CAPTURE.COMPLETED / DENIED / DECLINED events.
 *       Raw body is required for signature verification — route is mounted with
 *       express.raw() middleware in app.ts before express.json().
 *     responses:
 *       200:
 *         description: Webhook received
 *       401:
 *         description: Invalid PayPal signature
 */
router.post("/webhook/paypal", ShopController.paypalWebhook);


// Admin Coupon Management Routes (Secure)
import { authenticate } from "../../common/middleware/auth.js";
import { requireAdmin } from "../../common/middleware/requireAdmin.js";

router.get("/orders/me", authenticate, ShopController.getUserOrders);

router.get("/admin/coupons", authenticate, requireAdmin, ShopController.adminListCoupons);
router.post("/admin/coupons", authenticate, requireAdmin, ShopController.adminCreateCoupon);
router.patch("/admin/coupons/:id", authenticate, requireAdmin, ShopController.adminUpdateCoupon);
router.delete("/admin/coupons/:id", authenticate, requireAdmin, ShopController.adminDeleteCoupon);

router.get("/admin/transactions", authenticate, requireAdmin, ShopController.adminGetRazorpayTransactions);

export default router;
