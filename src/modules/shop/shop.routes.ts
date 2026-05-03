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
 * /shop/webhook:
 *   post:
 *     summary: Razorpay Webhook
 *     tags: [Shop]
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post("/webhook", ShopController.webhook);

export default router;
